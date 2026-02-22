"use client";

import { useState, useEffect, useRef } from "react";

const LANGUAGES = ["All", "JavaScript", "TypeScript", "Python", "Rust", "Go", "Java", "C++", "Ruby", "PHP", "Swift", "Kotlin", "HTML", "CSS"];
const DIFFICULTY_COLOR = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444" };

// Real difficulty: based on comment count + label hints
function getDifficulty(item) {
  const labelText = (item.labels || []).map(l => l.name.toLowerCase()).join(" ");
  if (labelText.includes("hard") || labelText.includes("complex") || labelText.includes("advanced")) return "Hard";
  if (labelText.includes("medium") || labelText.includes("intermediate")) return "Medium";
  // Use comment count as proxy: more comments = more complex
  const c = item.comments || 0;
  if (c >= 10) return "Hard";
  if (c >= 4) return "Medium";
  return "Easy";
}

function mapIssue(item) {
  const repoFullName = item.repository_url?.replace("https://api.github.com/repos/", "") || "unknown/repo";
  const orgName = repoFullName.split("/")[0];
  return {
    id: item.id,
    title: item.title,
    repo: repoFullName,
    labels: (item.labels || []).map(l => l.name),
    comments: item.comments || 0,
    createdAt: item.created_at?.slice(0, 10) || "",
    url: item.html_url,
    difficulty: getDifficulty(item),
    trending: (item.reactions?.total_count || 0) > 3 || (item.comments || 0) > 8,
    avatar: `https://github.com/${orgName}.png`,
  };
}

// Build GitHub search query from all active filters
function buildQuery({ lang, dateFilter, diffFilter, searchTerm }) {
  let q = `label:"good first issue" state:open`;
  if (lang !== "All") q += ` language:${lang}`;
  if (searchTerm.trim()) q += ` ${searchTerm.trim()} in:title`;

  // Date filter → GitHub "created:>DATE" qualifier
  const now = new Date();
  if (dateFilter === "today") {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    q += ` created:>${d.toISOString().slice(0, 10)}`;
  } else if (dateFilter === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    q += ` created:>${d.toISOString().slice(0, 10)}`;
  } else if (dateFilter === "month") {
    const d = new Date(now); d.setMonth(d.getMonth() - 1);
    q += ` created:>${d.toISOString().slice(0, 10)}`;
  }

  // Difficulty filter → map to comment count ranges GitHub supports
  if (diffFilter === "Easy") q += ` comments:0..3`;
  else if (diffFilter === "Medium") q += ` comments:4..9`;
  else if (diffFilter === "Hard") q += ` comments:10..999`;

  return q;
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("discover");

  // Filters — all sent to GitHub API
  const [lang, setLang] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");  // all | today | week | month
  const [diffFilter, setDiffFilter] = useState("All");  // All | Easy | Medium | Hard
  const [searchInput, setSearchInput] = useState("");    // raw input (debounced)
  const [searchTerm, setSearchTerm] = useState("");      // committed search term sent to API

  // Data
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [apiError, setApiError] = useState(false);

  // AI / favorites / toast
  const [favorites, setFavorites] = useState([]);
  const [expandedAI, setExpandedAI] = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiResults, setAiResults] = useState({});
  const [toast, setToast] = useState(null);

  const debounceRef = useRef(null);

  // localStorage for favorites
  useEffect(() => {
    const saved = localStorage.getItem("fav_issues");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("fav_issues", JSON.stringify(favorites));
  }, [favorites]);

  // Debounce search input → only fires API after user stops typing 600ms
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Re-fetch from page 1 whenever ANY filter changes
  useEffect(() => {
    setIssues([]);
    setPage(1);
    setHasMore(true);
    setApiError(false);
    doFetch(1, true);
  }, [lang, dateFilter, diffFilter, searchTerm]);

  async function doFetch(pageNum, reset = false) {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const q = buildQuery({ lang, dateFilter, diffFilter, searchTerm });
      const res = await fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=desc&per_page=30&page=${pageNum}`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      );
      if (res.status === 403) { setApiError("rate_limit"); if (reset) setLoading(false); else setLoadingMore(false); return; }
      const data = await res.json();
      const mapped = (data.items || []).map(mapIssue);
      setTotalCount(Math.min(data.total_count || 0, 1000)); // GitHub caps at 1000
      setIssues(prev => reset ? mapped : [...prev, ...mapped]);
      setHasMore(mapped.length === 30);
    } catch {
      setApiError("network");
    }
    if (reset) setLoading(false); else setLoadingMore(false);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    doFetch(next, false);
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const toggleFav = (issue) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === issue.id);
      if (exists) { showToast("Removed from saved"); return prev.filter(f => f.id !== issue.id); }
      showToast("⭐ Saved!"); return [...prev, issue];
    });
  };
  const isFav = (id) => favorites.some(f => f.id === id);

  const askAI = async (issue) => {
    if (aiResults[issue.id]) { setExpandedAI(expandedAI === issue.id ? null : issue.id); return; }
    setAiLoading(issue.id); setExpandedAI(issue.id);
    try {
      const res = await fetch("/api/ai-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: issue.title, repo: issue.repo, labels: issue.labels }),
      });
      const data = await res.json();
      setAiResults(prev => ({ ...prev, [issue.id]: data.guide || "Could not load guide." }));
    } catch {
      setAiResults(prev => ({ ...prev, [issue.id]: "AI guide unavailable right now." }));
    }
    setAiLoading(null);
  };

  // Favorites tab filtered locally (already fetched)
  const displayIssues = tab === "favorites"
    ? favorites.filter(i => {
        const matchSearch = !searchTerm || i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.repo.toLowerCase().includes(searchTerm.toLowerCase());
        return matchSearch;
      })
    : tab === "trending"
    ? issues.filter(i => i.trending)
    : issues;

  // ── THEME ──
  const bg       = dark ? "#0a0a0f" : "#f8f8fc";
  const surface  = dark ? "#13131a" : "#ffffff";
  const surface2 = dark ? "#1a1a24" : "#f0f0f8";
  const border   = dark ? "#2a2a3a" : "#e0e0ee";
  const text     = dark ? "#e8e8f0" : "#1a1a2e";
  const textMuted= dark ? "#6b6b8a" : "#8888aa";
  const accent   = "#6366f1";
  const accentG  = dark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)";

  const activeFilters = [lang !== "All", dateFilter !== "all", diffFilter !== "All", searchTerm !== ""].filter(Boolean).length;

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "'DM Sans','Segoe UI',sans-serif", transition: "background 0.3s,color 0.3s" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.05) 0%,transparent 70%)" }} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: accent, color: "#fff", padding: "10px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(99,102,241,0.4)", animation: "slideUp 0.3s ease" }}>
          {toast}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:${border};border-radius:3px;}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .card{animation:fadeIn 0.35s ease forwards;opacity:0;transition:transform 0.18s,box-shadow 0.18s;}
        .card:hover{transform:translateY(-2px);}
        .btn{transition:all 0.18s;cursor:pointer;}
        .view-btn:hover{background:${accent}!important;color:#fff!important;border-color:${accent}!important;}
        .load-btn:hover{background:${accent}!important;color:#fff!important;}
        .filter-chip{transition:all 0.18s;cursor:pointer;border:none;font-family:inherit;}
        .filter-chip:hover{opacity:0.85;}
        .tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;}
        input:focus,select:focus{outline:none;border-color:${accent}!important;box-shadow:0 0 0 3px ${accentG};}
        .skeleton{background:linear-gradient(90deg,${surface2} 25%,${border} 50%,${surface2} 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px;}
      `}</style>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* ── HEADER ── */}
        <div style={{ paddingTop: 48, paddingBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${accent},#8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔍</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>Issue<span style={{ color: accent }}>Quest</span></h1>
            </div>
            <p style={{ margin: 0, color: textMuted, fontSize: 13 }}>Search across all GitHub open source issues in real-time 🚀</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {totalCount > 0 && <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: 10, padding: "6px 14px", fontSize: 12, color: textMuted, fontFamily: "'DM Mono',monospace" }}>~{totalCount.toLocaleString()} results</div>}
            <button className="btn" onClick={() => setDark(!dark)} style={{ background: surface2, border: `1px solid ${border}`, borderRadius: 10, width: 38, height: 38, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", color: text }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 4, background: surface2, padding: 4, borderRadius: 14, border: `1px solid ${border}`, marginBottom: 20, width: "fit-content" }}>
          {[{ key: "discover", label: "✨ Discover" }, { key: "trending", label: "🔥 Trending" }, { key: "favorites", label: `⭐ Saved (${favorites.length})` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s", background: tab === t.key ? accent : "transparent", color: tab === t.key ? "#fff" : textMuted, fontFamily: "inherit" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SEARCH BAR (full API search) ── */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔎</span>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search all GitHub issues by keyword, repo, topic..."
            style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: 12, border: `1px solid ${border}`, background: surface, color: text, fontSize: 14, transition: "all 0.2s", fontFamily: "inherit" }}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearchTerm(""); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 16 }}>✕</button>
          )}
        </div>
        {searchInput && searchTerm !== searchInput && (
          <div style={{ fontSize: 12, color: textMuted, marginBottom: 10, paddingLeft: 4 }}>⏳ Searching in 0.6s...</div>
        )}
        {searchTerm && (
          <div style={{ fontSize: 12, color: accent, marginBottom: 10, paddingLeft: 4 }}>🔍 Showing results across all GitHub issues for "<strong>{searchTerm}</strong>"</div>
        )}

        {/* ── FILTER CHIPS ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>

          {/* Language */}
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${lang !== "All" ? accent : border}`, background: lang !== "All" ? accentG : surface, color: lang !== "All" ? accent : text, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: lang !== "All" ? 600 : 400, transition: "all 0.2s" }}>
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>

          {/* Date filter — actually uses GitHub API "created:>DATE" */}
          <div style={{ display: "flex", gap: 6, background: surface2, padding: 4, borderRadius: 10, border: `1px solid ${border}` }}>
            {[{ key: "all", label: "All Time" }, { key: "month", label: "This Month" }, { key: "week", label: "This Week" }, { key: "today", label: "Today" }].map(d => (
              <button key={d.key} className="filter-chip" onClick={() => setDateFilter(d.key)}
                style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: dateFilter === d.key ? accent : "transparent", color: dateFilter === d.key ? "#fff" : textMuted, transition: "all 0.18s" }}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Difficulty — maps to comment count ranges in API query */}
          <div style={{ display: "flex", gap: 6, background: surface2, padding: 4, borderRadius: 10, border: `1px solid ${border}` }}>
            {["All", "Easy", "Medium", "Hard"].map(d => (
              <button key={d} className="filter-chip" onClick={() => setDiffFilter(d)}
                style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: diffFilter === d ? (d === "All" ? accent : DIFFICULTY_COLOR[d]) : "transparent", color: diffFilter === d ? "#fff" : d === "All" ? textMuted : DIFFICULTY_COLOR[d], transition: "all 0.18s" }}>
                {d === "Easy" ? "✅ Easy" : d === "Medium" ? "⚡ Medium" : d === "Hard" ? "🔥 Hard" : "All Levels"}
              </button>
            ))}
          </div>

          {/* Clear all filters */}
          {activeFilters > 0 && (
            <button className="btn" onClick={() => { setLang("All"); setDateFilter("all"); setDiffFilter("All"); setSearchInput(""); setSearchTerm(""); }}
              style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${border}`, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
              ✕ Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* ── STATS ── */}
        {!loading && issues.length > 0 && tab !== "favorites" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
            {[
              { label: "Loaded", val: issues.length, icon: "📋" },
              { label: "Easy (0–3 comments)", val: issues.filter(i => i.difficulty === "Easy").length, icon: "✅" },
              { label: "Medium (4–9)", val: issues.filter(i => i.difficulty === "Medium").length, icon: "⚡" },
              { label: "Hard (10+)", val: issues.filter(i => i.difficulty === "Hard").length, icon: "🔥" },
            ].map(s => (
              <div key={s.label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flex: "1 1 110px" }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── API RATE LIMIT ERROR ── */}
        {apiError === "rate_limit" && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>GitHub API rate limit reached</div>
            <div style={{ color: textMuted, fontSize: 13 }}>GitHub allows 10 searches/minute without auth. Wait 1 minute and try again, or add a GITHUB_TOKEN to your .env.local for higher limits.</div>
          </div>
        )}

        {/* ── SKELETONS ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: 22, opacity: 1 - i * 0.1 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}><div className="skeleton" style={{ width: 20, height: 20, borderRadius: 4 }} /><div className="skeleton" style={{ width: 160, height: 13 }} /></div>
                <div className="skeleton" style={{ width: "75%", height: 16, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "50%", height: 13, marginBottom: 14 }} />
                <div style={{ display: "flex", gap: 6 }}>{[55, 75, 60, 80].map((w, j) => <div key={j} className="skeleton" style={{ width: w, height: 22, borderRadius: 20 }} />)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && !apiError && displayIssues.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: surface, borderRadius: 16, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>{tab === "favorites" ? "⭐" : "🔍"}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {tab === "favorites" ? "No saved issues yet" : "No issues match your filters"}
            </div>
            <div style={{ color: textMuted, fontSize: 13 }}>
              {tab === "favorites" ? "Click ☆ on any issue to save it here" : "Try relaxing your filters or a different search term"}
            </div>
          </div>
        )}

        {/* ── CARDS ── */}
        {!loading && displayIssues.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayIssues.map((issue, idx) => (
              <div key={issue.id} className="card" style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: "18px 20px", animationDelay: `${Math.min(idx, 12) * 0.04}s`, boxShadow: dark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.05)" }}>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <img src={issue.avatar} alt="" width={18} height={18} style={{ borderRadius: 4 }} onError={e => { e.target.style.display = "none"; }} />
                  <span style={{ fontSize: 12, color: accent, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{issue.repo}</span>
                  {issue.trending && <span className="tag" style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>🔥 Trending</span>}
                  <span className="tag" style={{ background: `${DIFFICULTY_COLOR[issue.difficulty]}18`, color: DIFFICULTY_COLOR[issue.difficulty], marginLeft: "auto" }}>
                    {issue.difficulty === "Easy" ? "✅" : issue.difficulty === "Medium" ? "⚡" : "🔥"} {issue.difficulty}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: text, flex: 1, minWidth: 0 }}>{issue.title}</h3>
                  <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                    <button onClick={() => toggleFav(issue)} className="btn" title="Save"
                      style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: isFav(issue.id) ? "rgba(234,179,8,0.12)" : surface2, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", color: isFav(issue.id) ? "#eab308" : textMuted }}>
                      {isFav(issue.id) ? "⭐" : "☆"}
                    </button>
                    <button onClick={() => askAI(issue)} className="btn"
                      style={{ height: 32, padding: "0 11px", borderRadius: 8, border: `1px solid ${accent}40`, background: expandedAI === issue.id ? accent : accentG, fontSize: 12, fontWeight: 600, color: expandedAI === issue.id ? "#fff" : accent, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                      {aiLoading === issue.id ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> : "🤖"} AI
                    </button>
                    <a href={issue.url} target="_blank" rel="noopener noreferrer" className="view-btn btn"
                      style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${border}`, background: surface2, textDecoration: "none", fontSize: 12, fontWeight: 600, color: text, display: "flex", alignItems: "center", gap: 5 }}>
                      View on GitHub →
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span className="tag" style={{ background: surface2, color: textMuted }}>💬 {issue.comments} comments</span>
                  <span className="tag" style={{ background: surface2, color: textMuted }}>🕐 {new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {issue.labels.filter(l => l !== "good first issue").slice(0, 3).map(l => (
                    <span key={l} className="tag" style={{ background: accentG, color: accent }}>{l}</span>
                  ))}
                </div>

                {expandedAI === issue.id && (
                  <div style={{ marginTop: 14, padding: "13px 15px", background: accentG, borderRadius: 10, border: `1px solid ${accent}30`, animation: "fadeIn 0.25s ease" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>🤖 AI Mentor Guide</div>
                    {aiLoading === issue.id
                      ? <div style={{ display: "flex", gap: 6, alignItems: "center", color: textMuted, fontSize: 13 }}><span style={{ animation: "pulse 1s infinite" }}>✨</span> Analyzing with Claude AI...</div>
                      : <div style={{ fontSize: 13, lineHeight: 1.75, color: text, whiteSpace: "pre-line" }}>{aiResults[issue.id]}</div>
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── LOAD MORE ── */}
        {!loading && tab !== "favorites" && hasMore && displayIssues.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <button onClick={loadMore} disabled={loadingMore} className="load-btn btn"
              style={{ padding: "12px 36px", borderRadius: 12, border: `1px solid ${border}`, background: surface, color: text, fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, opacity: loadingMore ? 0.6 : 1, cursor: loadingMore ? "not-allowed" : "pointer" }}>
              {loadingMore ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Loading...</> : <>Load 30 More ↓</>}
            </button>
            <div style={{ color: textMuted, fontSize: 12, marginTop: 8 }}>{issues.length} loaded · ~{totalCount.toLocaleString()} match your filters</div>
          </div>
        )}

        <div style={{ marginTop: 52, textAlign: "center", color: textMuted, fontSize: 12 }}>
          Built with ❤️ · Live data from GitHub API · Fork it and make it yours ⭐
        </div>
      </div>
    </div>
  );
}
