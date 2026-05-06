import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, get, set as fbSet, update } from '../services/firebase';
import { api } from '../services/api';
import MoodAnalysis from '../components/MoodAnalysis';
import QuoteRotator from '../components/QuoteRotator';
import TodoList from '../components/TodoList';
import Timetable from '../components/Timetable';
import AchievementMarquee from '../components/AchievementMarquee';
import PomodoroTimer from '../components/PomodoroTimer';
import WellnessCheckin from '../components/WellnessCheckin';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAward, FiTarget, FiFileText, FiCheck, FiAlertTriangle, FiZap } from 'react-icons/fi';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const [showMood, setShowMood] = useState(false);
  const [showWellness, setShowWellness] = useState(false);
  const [moodDone, setMoodDone] = useState(false);
  const [wellnessDone, setWellnessDone] = useState(false);
  const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1 });
  const [dailyTestState, setDailyTestState] = useState('check');
  const [dtQuestions, setDtQuestions] = useState([]);
  const [dtCurrentQ, setDtCurrentQ] = useState(0);
  const [dtAnswers, setDtAnswers] = useState({});
  const [dtResults, setDtResults] = useState([]);
  const [dtScore, setDtScore] = useState(0);
  const [dtLoading, setDtLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [userSubjects, setUserSubjects] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    // Mood check
    get(ref(database, `users/${user.uid}/mood/${today}`)).then(snap => {
      if (!snap.exists()) setShowMood(true); else setMoodDone(true);
    });
    // Wellness check
    get(ref(database, `users/${user.uid}/wellness/${today}`)).then(snap => {
      if (snap.exists()) setWellnessDone(true);
    });
    // Stats
    get(ref(database, `users/${user.uid}/gamification`)).then(snap => {
      if (snap.exists()) setStats(snap.val());
    });
    // Daily test check
    get(ref(database, `users/${user.uid}/dailyTests/${today}`)).then(snap => {
      if (snap.exists()) setDailyTestState('done');
      else setDailyTestState('check');
    });
    // Completed tasks
    get(ref(database, `users/${user.uid}/todos/${today}`)).then(snap => {
      if (snap.exists()) {
        const tasks = Object.values(snap.val()).filter(t => t.completed).map(t => t.title);
        setCompletedTasks(tasks);
        if (tasks.length >= 2) setDailyTestState(prev => prev === 'check' ? 'available' : prev);
      }
    });
    // User subjects
    get(ref(database, `users/${user.uid}/subjects`)).then(snap => {
      if (snap.exists()) setUserSubjects(Object.values(snap.val()).map(s => s.name));
    });
  }, [user, today]);

  const handleMoodComplete = () => { setShowMood(false); setMoodDone(true); setShowWellness(true); };
  const handleWellnessComplete = () => { setShowWellness(false); setWellnessDone(true); };

  const startDailyTest = async () => {
    setDtLoading(true);
    try {
      const res = await api.dailyTest({ completedTasks, userId: user.uid });
      setDtQuestions(res.questions || defaultDailyQs());
    } catch { setDtQuestions(defaultDailyQs()); }
    setDailyTestState('quiz'); setDtCurrentQ(0); setDtAnswers({}); setDtResults([]); setDtScore(0);
    setDtLoading(false);
  };

  const defaultDailyQs = () => completedTasks.slice(0, 10).map(t => ({
    question: `Explain what you learned about: ${t}`, points: 10,
  })).concat(Array.from({ length: Math.max(0, 10 - completedTasks.length) }, (_, i) => ({
    question: `Summarize a key concept from today's study (topic ${i + 1})`, points: 10,
  }))).slice(0, 10);

  const submitDtAnswer = () => {
    if (dtCurrentQ < dtQuestions.length - 1) setDtCurrentQ(c => c + 1);
    else finishDailyTest();
  };

  const finishDailyTest = async () => {
    setDtLoading(true); setDailyTestState('evaluating');
    const qaPairs = dtQuestions.map((q, i) => ({ question: q.question, answer: dtAnswers[i] || '' }));
    let fullResults, total;
    try {
      const res = await api.evaluateBatch({ questionsAndAnswers: qaPairs, userId: user.uid });
      const evals = res.results || [];
      fullResults = dtQuestions.map((q, i) => ({
        question: q.question, answer: dtAnswers[i] || '',
        score: evals[i]?.score || 0, feedback: evals[i]?.feedback || '',
      }));
      total = fullResults.reduce((s, r) => s + (r.score || 0), 0);
    } catch {
      fullResults = dtQuestions.map((q, i) => ({
        question: q.question, answer: dtAnswers[i] || '',
        score: Math.min(10, Math.max(1, Math.floor(((dtAnswers[i] || '').split(' ').length) / 3))),
        feedback: 'Basic evaluation applied.',
      }));
      total = fullResults.reduce((s, r) => s + r.score, 0);
    }
    setDtResults(fullResults); setDtScore(total);
    const pct = Math.round((total / (dtQuestions.length * 10)) * 100);
    const xpEarned = Math.round(pct / 2);
    await fbSet(ref(database, `users/${user.uid}/dailyTests/${today}`), {
      results: fullResults, totalScore: total, maxScore: dtQuestions.length * 10,
      scorePercent: pct, date: new Date().toISOString(),
    });
    const gamSnap = await get(ref(database, `users/${user.uid}/gamification`));
    const gam = gamSnap.exists() ? gamSnap.val() : { xp: 0, level: 1, streak: 0 };
    const newXp = (gam.xp || 0) + xpEarned;
    await update(ref(database, `users/${user.uid}/gamification`), { xp: newXp, level: Math.floor(newXp / 200) + 1 });
    const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
    const actData = actSnap.exists() ? actSnap.val() : {};
    await fbSet(ref(database, `users/${user.uid}/activity/${today}`), {
      ...actData, avgScore: pct,
      questionsAnswered: (actData.questionsAnswered || 0) + dtQuestions.length,
      tasksCompleted: completedTasks.length,
    });
    setDailyTestState('results'); setDtLoading(false);
  };

  const skipDailyTest = async () => {
    const gamSnap = await get(ref(database, `users/${user.uid}/gamification`));
    const gam = gamSnap.exists() ? gamSnap.val() : { xp: 0, level: 1 };
    const newXp = Math.max(0, (gam.xp || 0) - 20);
    await update(ref(database, `users/${user.uid}/gamification`), { xp: newXp });
    await fbSet(ref(database, `users/${user.uid}/dailyTests/${today}`), { skipped: true, date: new Date().toISOString() });
    setDailyTestState('done');
  };

  return (
    <div className="page">
      <div className="container">
        <motion.div className="welcome-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="welcome-text">
            <h1>Hello, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="welcome-sub">Every day is a new opportunity to grow. Make today count.</p>
          </div>
          <div className="quick-stats">
            <div className="quick-stat"><div className="qs-icon"><FiTrendingUp /></div><div><span className="qs-val">{stats.streak || 0}</span><span className="qs-label">Day Streak</span></div></div>
            <div className="quick-stat"><div className="qs-icon"><FiZap /></div><div><span className="qs-val">{stats.xp || 0}</span><span className="qs-label">XP Earned</span></div></div>
            <div className="quick-stat"><div className="qs-icon"><FiTarget /></div><div><span className="qs-val">Lvl {stats.level || 1}</span><span className="qs-label">Current Level</span></div></div>
          </div>
        </motion.div>

        {/* Mood Check-in */}
        {showMood && !moodDone && (
          <motion.div className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="section-title">How are you feeling today?</h2>
            <MoodAnalysis onComplete={handleMoodComplete} />
          </motion.div>
        )}

        {/* Wellness Check-in — shows after mood */}
        {showWellness && !wellnessDone && moodDone && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <WellnessCheckin onComplete={handleWellnessComplete} />
          </motion.div>
        )}

        {/* Pomodoro + Timetable Grid */}
        <div className="pomodoro-timetable-grid">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <PomodoroTimer userSubjects={userSubjects} />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Timetable />
          </motion.div>
        </div>

        {/* Daily Test */}
        {dailyTestState === 'available' && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card" style={{ borderLeft: '4px solid var(--accent)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <FiFileText size={22} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0 }}>Daily Knowledge Test</h3>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
                Based on your {completedTasks.length} completed tasks — 10-question quiz. Earn up to 50 XP!
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={startDailyTest} disabled={dtLoading}>
                  {dtLoading ? 'Generating...' : 'Start Daily Test'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={skipDailyTest}>
                  <FiAlertTriangle /> Skip (-20 XP)
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {dailyTestState === 'quiz' && (
          <motion.div className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="quiz-header">
              <span>Daily Test — Q{dtCurrentQ + 1}/{dtQuestions.length}</span>
              <div className="quiz-progress"><div style={{ width: `${((dtCurrentQ + 1) / dtQuestions.length) * 100}%` }} /></div>
            </div>
            <div className="card quiz-card">
              <h3>{dtQuestions[dtCurrentQ]?.question}</h3>
              <textarea className="input-field" rows={3} placeholder="Your answer..."
                value={dtAnswers[dtCurrentQ] || ''} onChange={e => setDtAnswers(a => ({ ...a, [dtCurrentQ]: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 12, width: '100%' }} onClick={submitDtAnswer} disabled={!dtAnswers[dtCurrentQ]?.trim()}>
              {dtCurrentQ < dtQuestions.length - 1 ? 'Next' : 'Submit for AI Evaluation'}
            </button>
          </motion.div>
        )}

        {dailyTestState === 'evaluating' && (
          <motion.div className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="card" style={{ textAlign: 'center', padding: 50 }}>
              <div className="loading-spinner" />
              <h3 style={{ marginTop: 20 }}>AI is grading your daily test...</h3>
            </div>
          </motion.div>
        )}

        {dailyTestState === 'results' && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="results-header">
              <h3>Daily Test Results</h3>
              <div className="results-score"><span className="score-big">{dtScore}</span>/{dtQuestions.length * 10}</div>
            </div>
            {dtResults.map((r, i) => (
              <div key={i} className="result-card card" style={{ marginBottom: 10 }}>
                <h4>Q{i + 1}: {r.question}</h4>
                <p className="result-answer">Your answer: {r.answer}</p>
                <div className="result-meta">
                  <span className="badge badge-primary">Score: {r.score}/10</span>
                  <p className="result-feedback">{r.feedback}</p>
                </div>
              </div>
            ))}
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setDailyTestState('done')}>
              <FiCheck /> Continue
            </button>
          </motion.div>
        )}

        {dailyTestState === 'done' && (
          <motion.div className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="card" style={{ textAlign: 'center', padding: 20 }}>
              <FiCheck size={24} style={{ color: 'var(--accent-secondary)' }} />
              <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>Daily test completed!</p>
            </div>
          </motion.div>
        )}

        <motion.div className="hero-quote-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="hero-quote-card">
            <div className="quote-icon"><FiAward /></div>
            <QuoteRotator />
          </div>
        </motion.div>

        {/* TodoList only (Timetable moved above) */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <TodoList />
        </motion.div>

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <AchievementMarquee />
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
