"use client";

import { useState, useEffect, useCallback } from "react";

const LANGUAGES = ["All", "JavaScript", "TypeScript", "Python", "Rust", "Go", "Java", "C++", "Ruby", "PHP", "Swift", "Kotlin", "HTML", "CSS"];

const ISSUES = [
  { id: 1, title: "Add dark mode support to dashboard components", repo: "vercel/next.js", repoStars: 124000, language: "TypeScript", labels: ["good first issue", "enhancement"], comments: 4, createdAt: "2025-02-18", url: "#", difficulty: "Easy", aiSummary: "You need to add CSS variables for theming and toggle them via React context. Requires knowledge of CSS custom properties and React hooks (useState, useContext).", trending: true, avatar: "https://github.com/vercel.png" },
  { id: 2, title: "Improve error messages for invalid config files", repo: "vitejs/vite", repoStars: 68000, language: "TypeScript", labels: ["good first issue", "bug"], comments: 2, createdAt: "2025-02-19", url: "#", difficulty: "Easy", aiSummary: "Update the config validation logic to return user-friendly error messages. You'll work in the config parser file — basic TypeScript and string formatting skills needed.", trending: true, avatar: "https://github.com/vitejs.png" },
  { id: 3, title: "Add unit tests for the auth middleware", repo: "supabase/supabase", repoStars: 71000, language: "TypeScript", labels: ["good first issue", "testing"], comments: 6, createdAt: "2025-02-15", url: "#", difficulty: "Medium", aiSummary: "Write Jest test cases for the existing auth middleware. You should know how to mock HTTP requests and understand JWT basics. Good for someone learning testing.", trending: false, avatar: "https://github.com/supabase.png" },
  { id: 4, title: "Fix typos in the Spanish translation file", repo: "freeCodeCamp/freeCodeCamp", repoStars: 396000, language: "JavaScript", labels: ["good first issue", "translation"], comments: 1, createdAt: "2025-02-20", url: "#", difficulty: "Easy", aiSummary: "Simple translation fix — no coding required! Just find and correct typos in the es.json locale file. Perfect for a first-ever open source contribution.", trending: false, avatar: "https://github.com/freecodecamp.png" },
  { id: 5, title: "Implement keyboard navigation for modal dialogs", repo: "shadcn-ui/ui", repoStars: 76000, language: "TypeScript", labels: ["good first issue", "accessibility"], comments: 8, createdAt: "2025-02-17", url: "#", difficulty: "Medium", aiSummary: "Add focus trapping and Escape key handler to modal components. Requires understanding of DOM focus management and React event listeners. Great accessibility contribution.", trending: true, avatar: "https://github.com/shadcn-ui.png" },
  { id: 6, title: "Add --dry-run flag to the CLI deploy command", repo: "netlify/cli", repoStars: 7200, language: "JavaScript", labels: ["good first issue", "cli"], comments: 3, createdAt: "2025-02-16", url: "#", difficulty: "Medium", aiSummary: "Add a new CLI flag using Commander.js. When flag is set, simulate deployment without actually running it. You need Node.js CLI experience.", trending: false, avatar: "https://github.com/netlify.png" },
  { id: 7, title: "Document the new streaming API endpoints", repo: "openai/openai-node", repoStars: 8400, language: "TypeScript", labels: ["good first issue", "documentation"], comments: 5, createdAt: "2025-02-14", url: "#", difficulty: "Easy", aiSummary: "Write JSDoc comments and README sections for the new streaming endpoints. Needs TypeScript reading ability and clear technical writing skills.", trending: true, avatar: "https://github.com/openai.png" },
  { id: 8, title: "Create a recipe parser utility function", repo: "TanStack/query", repoStars: 42000, language: "TypeScript", labels: ["good first issue", "feature"], comments: 7, createdAt: "2025-02-13", url: "#", difficulty: "Hard", aiSummary: "Build a utility to normalize and cache query keys from recipe objects. Advanced TypeScript generics knowledge required. Great challenge for intermediate developers.", trending: false, avatar: "https://github.com/TanStack.png" },
  { id: 9, title: "Add CSV export button to data tables", repo: "apache/superset", repoStars: 62000, language: "Python", labels: ["good first issue", "feature"], comments: 11, createdAt: "2025-02-12", url: "#", difficulty: "Medium", aiSummary: "Implement CSV download using Python's csv module and wire it to a React button. Needs basic Python + Flask API knowledge and some React.", trending: false, avatar: "https://github.com/apache.png" },
  { id: 10, title: "Fix mobile responsiveness on the settings page", repo: "calcom/cal.com", repoStars: 31000, language: "TypeScript", labels: ["good first issue", "bug", "mobile"], comments: 2, createdAt: "2025-02-21", url: "#", difficulty: "Easy", aiSummary: "Adjust Tailwind CSS breakpoint classes on the settings layout. Pure CSS/Tailwind work — no complex logic needed. Great for front-end beginners.", trending: true, avatar: "https://github.com/calcom.png" },
  { id: 11, title: "Add search to the package registry page", repo: "denoland/deno", repoStars: 96000, language: "Rust", labels: ["good first issue", "feature"], comments: 9, createdAt: "2025-02-10", url: "#", difficulty: "Hard", aiSummary: "Implement fuzzy search over package names in the registry UI. Rust + WebAssembly skills needed. Challenging but very rewarding for the resume.", trending: false, avatar: "https://github.com/denoland.png" },
  { id: 12, title: "Improve loading skeleton animations", repo: "tremorlabs/tremor", repoStars: 16000, language: "TypeScript", labels: ["good first issue", "ui"], comments: 4, createdAt: "2025-02-19", url: "#", difficulty: "Easy", aiSummary: "Enhance the shimmer animation on skeleton loader components using CSS keyframes. Needs CSS animation knowledge and basic React component editing.", trending: true, avatar: "https://github.com/tremorlabs.png" },
];

const DIFFICULTY_COLOR = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444" };

export default function App() {
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState("All");
  const [diffFilter, setDiffFilter] = useState("All");
  const [favorites, setFavorites] = useState([]);

  // Load favorites from localStorage after component mounts (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem("fav_issues");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);
  const [tab, setTab] = useState("discover"); // discover | trending | favorites
  const [expandedAI, setExpandedAI] = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiResults, setAiResults] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem("fav_issues", JSON.stringify(favorites));
  }, [favorites]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggleFav = (issue) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === issue.id);
      if (exists) { showToast("Removed from favorites"); return prev.filter(f => f.id !== issue.id); }
      showToast("⭐ Saved to favorites!"); return [...prev, issue];
    });
  };

  const isFav = (id) => favorites.some(f => f.id === id);

  const askAI = async (issue) => {
    if (aiResults[issue.id]) { setExpandedAI(expandedAI === issue.id ? null : issue.id); return; }
    setAiLoading(issue.id);
    setExpandedAI(issue.id);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an open source mentor. A beginner wants to work on this GitHub issue:
Title: "${issue.title}"
Repo: ${issue.repo}
Language: ${issue.language}
Labels: ${issue.labels.join(", ")}

Give a concise, encouraging analysis in 3 parts:
1. 🧠 What skills you need (2-3 bullets)
2. 🚀 How to approach it (2-3 steps)
3. ⏱️ Estimated time for a beginner

Keep it under 150 words. Be friendly and motivating.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || issue.aiSummary;
      setAiResults(prev => ({ ...prev, [issue.id]: text }));
    } catch {
      setAiResults(prev => ({ ...prev, [issue.id]: issue.aiSummary }));
    }
    setAiLoading(null);
  };

  const filtered = ISSUES.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.repo.toLowerCase().includes(search.toLowerCase());
    const matchLang = lang === "All" || i.language === lang;
    const matchDiff = diffFilter === "All" || i.difficulty === diffFilter;
    if (tab === "trending") return i.trending && matchSearch && matchLang && matchDiff;
    if (tab === "favorites") return isFav(i.id) && matchSearch && matchLang && matchDiff;
    return matchSearch && matchLang && matchDiff;
  });

  const bg = dark ? "#0a0a0f" : "#f8f8fc";
  const surface = dark ? "#13131a" : "#ffffff";
  const surface2 = dark ? "#1a1a24" : "#f0f0f8";
  const border = dark ? "#2a2a3a" : "#e0e0ee";
  const text = dark ? "#e8e8f0" : "#1a1a2e";
  const textMuted = dark ? "#6b6b8a" : "#8888aa";
  const accent = "#6366f1";
  const accentGlow = dark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", transition: "all 0.3s" }}>
      {/* Ambient background */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: dark ? "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)" : "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: dark ? "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)" : "radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%)" }} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 999, background: accent, color: "#fff", padding: "10px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(99,102,241,0.4)", animation: "slideUp 0.3s ease" }}>
          {toast}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 3px; }
        @keyframes slideUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .issue-card { transition: transform 0.2s, box-shadow 0.2s; animation: fadeIn 0.4s ease forwards; }
        .issue-card:hover { transform: translateY(-2px); }
        .btn-hover:hover { opacity: 0.85; transform: scale(0.98); }
        .tag { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
        input:focus { outline: none; border-color: ${accent} !important; box-shadow: 0 0 0 3px ${accentGlow}; }
        select:focus { outline: none; }
      `}</style>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>

        {/* Header */}
        <div style={{ paddingTop: 48, paddingBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔍</div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>
                Issue<span style={{ color: accent }}>Quest</span>
              </h1>
            </div>
            <p style={{ margin: 0, color: textMuted, fontSize: 14 }}>Find your perfect first open source contribution — powered by AI 🤖</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: 10, padding: "6px 12px", fontSize: 12, color: textMuted, fontFamily: "'DM Mono', monospace" }}>
              {ISSUES.length} issues
            </div>
            <button onClick={() => setDark(!dark)} className="btn-hover" style={{ background: surface2, border: `1px solid ${border}`, borderRadius: 10, width: 38, height: 38, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", color: text }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: surface2, padding: 4, borderRadius: 14, border: `1px solid ${border}`, marginBottom: 24, width: "fit-content" }}>
          {[{ key: "discover", label: "✨ Discover" }, { key: "trending", label: "🔥 Trending" }, { key: "favorites", label: `⭐ Saved (${favorites.length})` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s", background: tab === t.key ? accent : "transparent", color: tab === t.key ? "#fff" : textMuted, fontFamily: "inherit" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search issues or repos..." style={{ flex: 1, minWidth: 220, padding: "10px 16px", borderRadius: 12, border: `1px solid ${border}`, background: surface, color: text, fontSize: 14, transition: "all 0.2s", fontFamily: "inherit" }} />
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ padding: "10px 16px", borderRadius: 12, border: `1px solid ${border}`, background: surface, color: text, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
          <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} style={{ padding: "10px 16px", borderRadius: 12, border: `1px solid ${border}`, background: surface, color: text, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {["All", "Easy", "Medium", "Hard"].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          {[{ label: "Total Issues", val: ISSUES.length, icon: "📋" }, { label: "Easy Picks", val: ISSUES.filter(i => i.difficulty === "Easy").length, icon: "✅" }, { label: "Trending Now", val: ISSUES.filter(i => i.trending).length, icon: "🔥" }, { label: "Languages", val: new Set(ISSUES.map(i => i.language)).size, icon: "💻" }].map(s => (
            <div key={s.label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, flex: "1 1 140px" }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Results count */}
        <div style={{ fontSize: 13, color: textMuted, marginBottom: 16 }}>
          Showing <strong style={{ color: text }}>{filtered.length}</strong> issues {tab === "trending" ? "trending now" : tab === "favorites" ? "saved by you" : ""}
        </div>

        {/* Issue Cards */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: surface, borderRadius: 16, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{tab === "favorites" ? "⭐" : "🔍"}</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{tab === "favorites" ? "No saved issues yet" : "No issues found"}</div>
            <div style={{ color: textMuted, fontSize: 14 }}>{tab === "favorites" ? "Star issues you like to save them here" : "Try adjusting your search or filters"}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((issue, idx) => (
              <div key={issue.id} className="issue-card" style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: "20px 22px", animationDelay: `${idx * 0.05}s`, boxShadow: dark ? "0 2px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)" }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <img src={issue.avatar} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} onError={e => { e.target.style.display = "none" }} />
                      <span style={{ fontSize: 12, color: accent, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{issue.repo}</span>
                      {issue.trending && <span className="tag" style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>🔥 Trending</span>}
                    </div>
                    <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: text }}>{issue.title}</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span className="tag" style={{ background: `${DIFFICULTY_COLOR[issue.difficulty]}20`, color: DIFFICULTY_COLOR[issue.difficulty] }}>{issue.difficulty}</span>
                      <span className="tag" style={{ background: surface2, color: textMuted }}>💻 {issue.language}</span>
                      <span className="tag" style={{ background: surface2, color: textMuted }}>⭐ {(issue.repoStars / 1000).toFixed(0)}k</span>
                      <span className="tag" style={{ background: surface2, color: textMuted }}>💬 {issue.comments}</span>
                      {issue.labels.filter(l => l !== "good first issue").slice(0, 2).map(l => (
                        <span key={l} className="tag" style={{ background: accentGlow, color: accent }}>{l}</span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => toggleFav(issue)} className="btn-hover" title="Save" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${border}`, background: isFav(issue.id) ? "rgba(234,179,8,0.15)" : surface2, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", color: isFav(issue.id) ? "#eab308" : textMuted }}>
                      {isFav(issue.id) ? "⭐" : "☆"}
                    </button>
                    <button onClick={() => askAI(issue)} className="btn-hover" style={{ height: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${accent}40`, background: expandedAI === issue.id ? accent : accentGlow, cursor: "pointer", fontSize: 12, fontWeight: 600, color: expandedAI === issue.id ? "#fff" : accent, display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s", fontFamily: "inherit" }}>
                      {aiLoading === issue.id ? <span style={{ animation: "pulse 1s infinite" }}>⏳</span> : "🤖"} AI Guide
                    </button>
                    <a href={issue.url} style={{ height: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${border}`, background: surface2, textDecoration: "none", fontSize: 12, fontWeight: 600, color: text, display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}>
                      View →
                    </a>
                  </div>
                </div>

                {/* AI Panel */}
                {expandedAI === issue.id && (
                  <div style={{ marginTop: 16, padding: "14px 16px", background: accentGlow, borderRadius: 10, border: `1px solid ${accent}30`, animation: "fadeIn 0.3s ease" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>🤖 AI Mentor Guide</div>
                    {aiLoading === issue.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", color: textMuted, fontSize: 13 }}>
                        <span style={{ animation: "pulse 1s infinite" }}>✨</span> Analyzing issue with Claude AI...
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: text, whiteSpace: "pre-line" }}>{aiResults[issue.id] || issue.aiSummary}</div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: textMuted }}>good first issue</span>
                  <span style={{ color: border }}>•</span>
                  <span style={{ fontSize: 11, color: textMuted }}>{new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, textAlign: "center", color: textMuted, fontSize: 12 }}>
          Built with ❤️ as an open source project • Fork it on GitHub and make it yours ⭐
        </div>
      </div>
    </div>
  );
}