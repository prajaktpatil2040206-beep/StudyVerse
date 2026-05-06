import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, get, onValue, update, set as fbSet, push } from '../services/firebase';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { FiZap, FiAward, FiTrendingUp, FiStar, FiCheck, FiLock, FiTarget, FiActivity, FiBook, FiClock, FiPlay } from 'react-icons/fi';
import Footer from '../components/Footer';
import './Gamification.css';

const DAILY_CHALLENGES = [
  { id: 'study3', title: 'Study for 3 Hours', xp: 50, Icon: FiBook, description: 'Complete 3 hours via Pomodoro or "study X hours" tasks (Auto-completes)' },
  { id: 'workout', title: 'Workout Session', xp: 30, Icon: FiActivity, description: '60 minutes of physical exercise' },
  { id: 'quiz', title: 'Daily Challenge Quiz', xp: 40, Icon: FiTarget, description: 'Complete the AI-generated MCQ quiz below' },
  { id: 'todos', title: 'Clear All Tasks', xp: 60, Icon: FiCheck, description: 'Finish every item on your task list (Auto-completes)' },
  { id: 'early', title: 'Early Start', xp: 20, Icon: FiClock, description: 'Begin your day before 10 AM' },
  { id: 'timetable', title: 'Follow Schedule', xp: 45, Icon: FiTrendingUp, description: 'Stick to your timetable at 80% or above' },
];

const BADGES = [
  { id: 'nightowl', name: 'Night Owl', condition: 'Study after 11 PM for 7 days', color: '#6C63FF', emoji: '🦉' },
  { id: 'earlybird', name: 'Early Bird', condition: 'Wake before 7 AM for 7 days', color: '#FDCB6E', emoji: '🐤' },
  { id: 'hardworker', name: 'Hard Worker', condition: 'Complete all challenges for 5 days', color: '#E17055', emoji: '💪' },
  { id: 'streakmaster', name: 'Streak Master', condition: '30-day study streak', color: '#00B894', emoji: '🔥' },
  { id: 'quizchamp', name: 'Quiz Champion', condition: 'Score 90%+ on 10 assessments', color: '#0984E3', emoji: '🏆' },
  { id: 'topranker', name: 'Top Ranker', condition: 'Reach top 10 on leaderboard', color: '#FDCB6E', emoji: '👑' },
  { id: 'streak3', name: 'Streak Starter', condition: '3-day study streak', color: '#00cec9', emoji: '⚡' },
  { id: 'streak10', name: 'Streak Legend', condition: '10-day study streak', color: '#6C63FF', emoji: '🌟' },
  { id: 'perfect10', name: 'Perfect Score', condition: '10/10 on any assessment', color: '#e84393', emoji: '💯' },
  { id: 'quizmaster', name: 'Quiz Master', condition: '10/10 on 3 challenge quizzes', color: '#00B894', emoji: '🎯' },
  { id: 'speedlearner', name: 'Speed Learner', condition: 'Complete assessment under 15 min', color: '#fdcb6e', emoji: '⚡' },
  { id: 'consistency', name: 'Consistency King', condition: '30-day login streak', color: '#E17055', emoji: '🎖️' },
];

export default function Gamification() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('challenges');
  const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1, badges: {} });
  const [completedChallenges, setCompletedChallenges] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  // Daily challenge quiz state
  const [quizState, setQuizState] = useState('idle'); // idle, loading, quiz, results
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    onValue(ref(database, `users/${user.uid}/gamification`), snap => { if (snap.exists()) setStats(snap.val()); });
    onValue(ref(database, `users/${user.uid}/gamification/dailyChallenges/${today}`), snap => { if (snap.exists()) setCompletedChallenges(snap.val()); });
    onValue(ref(database, 'leaderboard'), snap => {
      if (snap.exists()) {
        const items = Object.entries(snap.val()).map(([id, val]) => ({ id, ...val })).sort((a, b) => (b.xp || 0) - (a.xp || 0));
        setLeaderboard(items);
      }
    });
    get(ref(database, 'achievements')).then(snap => {
      if (snap.exists()) setActivityFeed(Object.values(snap.val()).slice(-10).reverse());
    });
    // Check quiz attempt
    get(ref(database, `users/${user.uid}/gamification/dailyChallenges/${today}/quizAttempt`)).then(snap => {
      if (snap.exists()) setQuizState('done');
    });
  }, [user, today]);

  // Auto-complete challenges when conditions are met
  useEffect(() => {
    if (!user?.uid || !stats.xp) return;
    
    const autoCheckChallenges = async () => {
      // Check study hours challenge
      if (!completedChallenges['study3']) {
        const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
        const act = actSnap.exists() ? actSnap.val() : {};
        if ((act.studyHours || 0) >= 3) {
          console.log('✅ Auto-completing "Study for 3 Hours" challenge');
          completeChallenge({ id: 'study3', title: 'Study for 3 Hours', xp: 50 });
        }
      }
      
      // Check todos challenge
      if (!completedChallenges['todos']) {
        const todosSnap = await get(ref(database, `users/${user.uid}/todos/${today}`));
        if (todosSnap.exists()) {
          const todos = Object.values(todosSnap.val());
          const incomplete = todos.filter(t => !t.completed);
          if (todos.length > 0 && incomplete.length === 0) {
            console.log('✅ Auto-completing "Clear All Tasks" challenge');
            completeChallenge({ id: 'todos', title: 'Clear All Tasks', xp: 60 });
          }
        }
      }
    };
    
    autoCheckChallenges();
  }, [user, stats, completedChallenges, today]);

  const completeChallenge = async (challenge) => {
    if (completedChallenges[challenge.id]) return;
    
    // Special validation for study hours challenge
    if (challenge.id === 'study3') {
      const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
      const act = actSnap.exists() ? actSnap.val() : {};
      const studyHours = act.studyHours || 0;
      
      if (studyHours < 3) {
        alert(`You need to complete 3 hours of study first. Current: ${studyHours.toFixed(1)} hours.\n\nComplete Pomodoro sessions or tasks with "study X hours" in the title.`);
        return;
      }
    }
    
    // Special validation for todos challenge
    if (challenge.id === 'todos') {
      const todosSnap = await get(ref(database, `users/${user.uid}/todos/${today}`));
      if (todosSnap.exists()) {
        const todos = Object.values(todosSnap.val());
        const incomplete = todos.filter(t => !t.completed);
        if (incomplete.length > 0) {
          alert(`You still have ${incomplete.length} incomplete task(s). Complete all tasks first!`);
          return;
        }
      }
    }
    
    const newCompleted = { ...completedChallenges, [challenge.id]: true };
    setCompletedChallenges(newCompleted);
    const newXp = (stats.xp || 0) + challenge.xp;
    const newLevel = Math.floor(newXp / 200) + 1;
    await update(ref(database, `users/${user.uid}/gamification`), { xp: newXp, level: newLevel });
    await fbSet(ref(database, `users/${user.uid}/gamification/dailyChallenges/${today}`), newCompleted);
    await update(ref(database, `leaderboard/${user.uid}`), { name: user.name, xp: newXp, streak: stats.streak || 0, level: newLevel });
    const achRef = push(ref(database, 'achievements'));
    await fbSet(achRef, { userId: user.uid, userName: user.name, message: `${user.name} completed "${challenge.title}" (+${challenge.xp} XP)`, timestamp: new Date().toISOString() });
    // Badge checks
    checkAndAwardBadges({ ...stats, xp: newXp, level: newLevel });
  };

  const checkAndAwardBadges = async (currentStats) => {
    const newBadges = { ...(currentStats.badges || {}) };
    let changed = false;
    if ((currentStats.streak || 0) >= 3 && !newBadges.streak3) { newBadges.streak3 = true; changed = true; }
    if ((currentStats.streak || 0) >= 10 && !newBadges.streak10) { newBadges.streak10 = true; changed = true; }
    if ((currentStats.streak || 0) >= 30 && !newBadges.streakmaster) { newBadges.streakmaster = true; changed = true; }
    if (changed) await update(ref(database, `users/${user.uid}/gamification`), { badges: newBadges });
  };

  // Daily Challenge Quiz (Z.AI MCQ)
  const startChallengeQuiz = async () => {
    if (completedChallenges['quiz'] || quizState !== 'idle') return;
    setQuizState('loading');
    try {
      const domain = user?.course || user?.college || 'General';
      const res = await api.dailyChallengeQuiz({ topic: domain, userDomain: domain, userId: user.uid });
      setQuizQuestions(res.questions || []);
      setQuizIdx(0); setQuizAnswers({});
      setQuizState('quiz');
    } catch { setQuizState('idle'); }
  };

  const submitChallengeQuiz = async () => {
    // Evaluate MCQ answers
    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] && quizAnswers[i] === q.correct) correct++;
    });
    const score = correct;
    const pct = Math.round((score / quizQuestions.length) * 100);
    const xpEarned = score * 10;
    setQuizResults({ score, total: quizQuestions.length, pct, xpEarned, questions: quizQuestions, answers: quizAnswers });
    setQuizState('results');
    
    // Save result
    await fbSet(ref(database, `users/${user.uid}/gamification/dailyChallenges/${today}/quizAttempt`), {
      score, total: quizQuestions.length, pct, xpEarned, date: today,
    });
    
    // Award XP
    const gamSnap = await get(ref(database, `users/${user.uid}/gamification`));
    const gam = gamSnap.exists() ? gamSnap.val() : { xp: 0, level: 1, streak: 0, badges: {} };
    const newXp = (gam.xp || 0) + xpEarned;
    const newLevel = Math.floor(newXp / 200) + 1;
    await update(ref(database, `users/${user.uid}/gamification`), { xp: newXp, level: newLevel });
    
    // Update activity - track questions answered
    const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
    const act = actSnap.exists() ? actSnap.val() : {};
    await update(ref(database, `users/${user.uid}/activity/${today}`), {
      ...act,
      questionsAnswered: (act.questionsAnswered || 0) + quizQuestions.length,
      avgScore: pct // Update average score
    });
    
    // Award badges
    if (pct === 100 && !gam.badges?.perfect10) {
      await update(ref(database, `users/${user.uid}/gamification`), { 
        badges: { ...(gam.badges || {}), perfect10: true } 
      });
    }
    
    // Mark quiz challenge as complete
    const newCompleted = { ...completedChallenges, quiz: true };
    setCompletedChallenges(newCompleted);
    await fbSet(ref(database, `users/${user.uid}/gamification/dailyChallenges/${today}`), newCompleted);
    
    // Update leaderboard
    await update(ref(database, `leaderboard/${user.uid}`), { 
      name: user.name, 
      xp: newXp, 
      streak: gam.streak || 0, 
      level: newLevel 
    });
    
    console.log(`✅ Quiz completed: ${score}/${quizQuestions.length} correct, +${xpEarned} XP`);
  };

  const totalDailyXp = DAILY_CHALLENGES.reduce((s, c) => s + c.xp, 0);
  const earnedDailyXp = DAILY_CHALLENGES.filter(c => completedChallenges[c.id]).reduce((s, c) => s + c.xp, 0);
  const xpForNextLevel = ((stats.level || 1) * 200) - (stats.xp || 0);

  const TABS = [
    { id: 'challenges', label: 'Daily Challenges' },
    { id: 'quiz', label: '🧠 Quiz Challenge' },
    { id: 'badges', label: 'Badges' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="page">
      <div className="container">
        <motion.div className="page-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1>Gamification</h1>
          <p>Complete challenges, earn XP, collect badges, and climb the ranks</p>
        </motion.div>

        <motion.div className="gam-stats-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="gam-stat-card"><div className="gam-stat-emoji"><FiTrendingUp /></div><span className="gam-stat-val">{stats.streak || 0}</span><div className="gam-stat-label">Day Streak</div></div>
          <div className="gam-stat-card"><div className="gam-stat-emoji"><FiZap /></div><span className="gam-stat-val">{stats.xp || 0}</span><div className="gam-stat-label">Total XP</div></div>
          <div className="gam-stat-card"><div className="gam-stat-emoji"><FiStar /></div><span className="gam-stat-val">Level {stats.level || 1}</span><div className="gam-stat-label">{xpForNextLevel} XP to next</div></div>
          <div className="gam-stat-card"><div className="gam-stat-emoji"><FiAward /></div><span className="gam-stat-val">{Object.keys(stats.badges || {}).length}</span><div className="gam-stat-label">Badges</div></div>
        </motion.div>

        <div className="xp-progress-section">
          <div className="xp-progress-header"><span>Level {stats.level || 1}</span><span>{stats.xp || 0} / {(stats.level || 1) * 200} XP</span><span>Level {(stats.level || 1) + 1}</span></div>
          <div className="xp-progress-bar"><div className="xp-progress-fill" style={{ width: `${((stats.xp || 0) % 200) / 200 * 100}%` }} /></div>
        </div>

        {/* Tab Navigation */}
        <div className="gam-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`gam-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Daily Challenges Tab */}
        {activeTab === 'challenges' && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-title"><FiTarget /> Daily Challenges <span className="daily-xp-badge">{earnedDailyXp}/{totalDailyXp} XP</span></div>
            <div className="challenges-grid">
              {DAILY_CHALLENGES.map((ch, i) => (
                <motion.div key={ch.id} className={`challenge-card ${completedChallenges[ch.id] ? 'completed' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                  <div className="ch-icon"><ch.Icon size={18} /></div>
                  <div className="ch-info"><h4>{ch.title}</h4><p>{ch.description}</p></div>
                  <div className="ch-xp">+{ch.xp} XP</div>
                  <button className={`btn btn-sm ${completedChallenges[ch.id] ? 'btn-success' : 'btn-primary'}`}
                    onClick={() => ch.id === 'quiz' ? setActiveTab('quiz') : completeChallenge(ch)}
                    disabled={!!completedChallenges[ch.id]}>
                    {completedChallenges[ch.id] ? <><FiCheck /> Done</> : ch.id === 'quiz' ? <><FiPlay /> Start Quiz</> : 'Complete'}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quiz Challenge Tab */}
        {activeTab === 'quiz' && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-title">🧠 Daily Challenge Quiz <span className="daily-xp-badge">Up to 50 XP</span></div>

            {quizState === 'idle' && (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                <h3>AI-Generated MCQ Quiz</h3>
                <p style={{ color: 'var(--muted)', marginBottom: 20 }}>5 multiple-choice questions based on your domain. Powered by Z.AI. Earn 10 XP per correct answer!</p>
                {completedChallenges['quiz']
                  ? <div className="badge badge-success" style={{ fontSize: 14, padding: '8px 16px' }}>✓ Completed for today!</div>
                  : <button className="btn btn-primary btn-lg" onClick={startChallengeQuiz}>Start Quiz (5 Questions)</button>}
              </div>
            )}

            {quizState === 'loading' && (
              <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                <div className="loading-spinner" />
                <h3 style={{ marginTop: 20 }}>Z.AI is generating your quiz...</h3>
              </div>
            )}

            {quizState === 'quiz' && quizQuestions.length > 0 && (
              <div className="card" style={{ padding: 28 }}>
                <div className="quiz-header">
                  <span>Question {quizIdx + 1} / {quizQuestions.length}</span>
                  <div className="quiz-progress"><div style={{ width: `${((quizIdx + 1) / quizQuestions.length) * 100}%` }} /></div>
                </div>
                <h3 style={{ margin: '20px 0 24px', fontSize: 17 }}>{quizQuestions[quizIdx]?.question}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(quizQuestions[quizIdx]?.options || {}).map(([key, val]) => (
                    <button key={key}
                      className={`mcq-option ${quizAnswers[quizIdx] === key ? 'selected' : ''}`}
                      onClick={() => setQuizAnswers(a => ({ ...a, [quizIdx]: key }))}>
                      <span className="mcq-option-key">{key}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{val}</span>
                      {quizAnswers[quizIdx] === key && <FiCheck />}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setQuizIdx(i => Math.max(0, i - 1))} disabled={quizIdx === 0}>← Back</button>
                  {quizIdx < quizQuestions.length - 1
                    ? <button className="btn btn-primary" onClick={() => setQuizIdx(i => i + 1)} disabled={!quizAnswers[quizIdx]}>Next →</button>
                    : <button className="btn btn-success" onClick={submitChallengeQuiz}>Submit Quiz ✓</button>}
                </div>
              </div>
            )}

            {quizState === 'results' && quizResults && (
              <div className="card" style={{ padding: 28 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 48 }}>{quizResults.pct === 100 ? '🏆' : quizResults.pct >= 60 ? '⭐' : '📚'}</div>
                  <h3>{quizResults.score}/{quizResults.total} Correct</h3>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{quizResults.pct}%</div>
                  <div className="badge badge-success">+{quizResults.xpEarned} XP Earned!</div>
                </div>
                {quizResults.questions.map((q, i) => {
                  const userAns = quizResults.answers[i];
                  const isCorrect = userAns === q.correct;
                  return (
                    <div key={i} style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: isCorrect ? 'rgba(0,184,148,0.08)' : 'rgba(225,112,85,0.08)', borderLeft: `3px solid ${isCorrect ? '#00B894' : '#e17055'}` }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Q{i + 1}: {q.question}</div>
                      <div style={{ fontSize: 13, color: isCorrect ? '#00B894' : '#e17055' }}>Your answer: {q.options?.[userAns] || 'Not answered'} {isCorrect ? '✓' : '✗'}</div>
                      {!isCorrect && <div style={{ fontSize: 13, color: '#00B894' }}>Correct: {q.options?.[q.correct]}</div>}
                      {q.explanation && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{q.explanation}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {quizState === 'done' && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <FiCheck size={40} style={{ color: '#00B894' }} />
                <h3 style={{ marginTop: 12 }}>Quiz Completed for Today!</h3>
                <p style={{ color: 'var(--muted)' }}>Come back tomorrow for a new challenge.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-title"><FiAward /> Badge Collection <span style={{ fontSize: 13, color: 'var(--muted)' }}>{Object.keys(stats.badges || {}).length}/{BADGES.length} earned</span></div>
            <div className="badges-grid">
              {BADGES.map(badge => {
                const earned = stats.badges && stats.badges[badge.id];
                return (
                  <div key={badge.id} className={`badge-card ${earned ? 'earned' : 'locked'}`}>
                    <div className="badge-emoji" style={{ background: earned ? badge.color : 'var(--bg)', boxShadow: 'var(--neu-small)', fontSize: 24 }}>{badge.emoji}</div>
                    <h4>{badge.name}</h4>
                    <p>{badge.condition}</p>
                    {!earned && <FiLock className="badge-lock" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-title"><FiTrendingUp /> Leaderboard</div>
            <div className="leaderboard-card card">
              <table className="leaderboard-table">
                <thead><tr><th>Rank</th><th>Student</th><th>XP</th><th>Streak</th><th>Level</th></tr></thead>
                <tbody>
                  {(leaderboard.length > 0 ? leaderboard : [
                    { id: '1', name: 'Vivek Kumar', xp: 2450, streak: 45, level: 13 },
                  ]).slice(0, 10).map((entry, i) => (
                    <tr key={entry.id} className={entry.id === user?.uid ? 'current-user' : ''}>
                      <td><span className="rank-badge">#{i + 1}</span></td>
                      <td className="name-cell"><div className="lb-avatar">{entry.name?.charAt(0)}</div>{entry.name}</td>
                      <td className="xp-cell"><FiZap size={12} /> {entry.xp}</td>
                      <td>{entry.streak}d</td>
                      <td>Lvl {entry.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-title"><FiZap /> Live Activity</div>
            <div className="activity-feed">
              {(activityFeed.length > 0 ? activityFeed : [
                { message: 'Be the first to complete a challenge today!', timestamp: new Date().toISOString() },
              ]).map((act, i) => (
                <div key={i} className="activity-item"><span>{act.message}</span><span className="activity-time">{new Date(act.timestamp).toLocaleTimeString()}</span></div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}
