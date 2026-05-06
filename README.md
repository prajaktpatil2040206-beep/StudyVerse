# 📚 StudyVerse

**AI-Powered Student Productivity Tracker**

A full-stack productivity platform that helps students manage tasks, track study progress, set goals, and improve daily productivity — powered by a local AI mentor (Qwen 2.5).

## Features

- 🔐 **OTP-based Authentication** — Email login via Gmail SMTP
- ✅ **Task Management** — Full CRUD with priorities and deadlines
- 📅 **AI Timetable Generator** — Personalized daily schedules
- 🤖 **AI Teacher Chat** — Personal mentor with voice input support
- 📝 **AI Assessments** — Auto-generated quizzes with scoring
- 🎯 **Goal Setting** — AI-powered actionable suggestions
- 🎮 **Gamification** — XP, streaks, badges, leaderboard
- 📊 **Dashboard** — GitHub-style heatmap, analytics charts
- 🌤️ **Mood Analysis** — Daily sentiment tracking
- 📄 **PDF Export** — Download timetables and assessment results

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite, Framer Motion, Recharts |
| Backend | Python FastAPI + Uvicorn |
| Database | Firebase Realtime Database |
| AI Model | Qwen 2.5 0.5B (local, HuggingFace Transformers) |
| Email | Gmail SMTP |

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Team

Built for Hackathon 2026 🚀
