<div align="center">

# 🔍 IssueQuest

**Find your perfect first open source contribution — powered by AI**

**[🚀 Live Demo](https://issuequest.vercel.app/)** · **[🐛 Report Bug](https://github.com/vivekghodekar001/issuequest/issues)**

![IssueQuest Screenshot](<img width="2214" height="1599" alt="Screenshot 2026-02-22 221310" src="https://github.com/user-attachments/assets/9ce754ee-8eeb-4b0b-9122-80f29eff5538" />)

</div>

---

## ✨ Features

- 🔍 **Real-time Search** — searches across all of GitHub, not just pre-loaded issues (debounced 600ms)
- 📅 **Date Filter** — Today / This Week / This Month / All Time via GitHub's `created:>DATE` qualifier
- ⚡ **Difficulty Filter** — Easy / Medium / Hard mapped to real GitHub comment count ranges
- 🤖 **AI Mentor Guide** — Claude AI explains what skills you need and how to approach each issue
- ⭐ **Save Favorites** — bookmark issues, persisted in localStorage
- 🔥 **Trending Tab** — surfaces high-engagement issues automatically
- 🌙 **Dark / Light Mode** — smooth theme toggle
- 📄 **Load More** — 30 issues per page, up to 1000 results

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/issuequest.git
cd issuequest
npm install
```

### 2. Add environment variables

Create `.env.local` in the root:

```env
# github.com/settings/tokens → public_repo scope
GITHUB_TOKEN=ghp_your_token_here

# console.anthropic.com (optional — for AI feature)
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

### 3. Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
issuequest/
├── app/
│   ├── page.js              ← Main UI
│   ├── layout.js
│   └── api/
│       └── ai-guide/
│           └── route.js     ← Claude AI endpoint
└── .env.local               ← Secret keys (never commit)
```

---

## 🧠 How Difficulty Works

GitHub doesn't label difficulty, so IssueQuest uses comment count as a proxy:

| Level | Comment count | GitHub query |
|-------|--------------|--------------|
| ✅ Easy | 0 – 3 | `comments:0..3` |
| ⚡ Medium | 4 – 9 | `comments:4..9` |
| 🔥 Hard | 10+ | `comments:10..999` |

Filtering happens **server-side via GitHub API** — not just hiding cards locally.

---

## 🌍 Deploy to Vercel

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Add `GITHUB_TOKEN` and `ANTHROPIC_API_KEY` in environment variables
4. Deploy ✅ — auto-deploys on every `git push`

---

## 📄 License

MIT — free to use and fork. A ⭐ star is always appreciated!

<div align="center">

**Made with ❤️ by [Vivek_Ghodekar](https://github.com/vivekghodekar001)**

</div>
