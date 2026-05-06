import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, get, onValue, update, set as fbSet, push } from '../services/firebase';
import { motion } from 'framer-motion';
import { FiZap, FiAward, FiTrendingUp, FiStar, FiCheck, FiLock, FiTarget, FiActivity, FiBook, FiClock } from 'react-icons/fi';
import Footer from '../components/Footer';
import './Gamification.css';

const DAILY_CHALLENGES = [
  { id: 'study3', title: 'Study for 3 Hours', xp: 50, Icon: FiBook, description: 'Complete 3 hours of focused study' },
  { id: 'workout', title: 'Workout Session', xp: 30, Icon: FiActivity, description: '60 minutes of physical exercise' },
  { id: 'quiz', title: 'Daily Assessment', xp: 40, Icon: FiTarget, description: 'Complete the daily knowledge quiz' },
  { id: 'todos', title: 'Clear All Tasks', xp: 60, Icon: FiCheck, description: 'Finish every item on your task list' },
  { id: 'early', title: 'Early Start', xp: 20, Icon: FiClock, description: 'Begin your day before 10 AM' },
  { id: 'timetable', title: 'Follow Schedule', xp: 45, Icon: FiTrendingUp, description: 'Stick to your timetable at 80% or above' },
];

const BADGES = [
  { id: 'nightowl', name: 'Night Owl', condition: 'Study after 11 PM for 7 days', color: '#6C63FF' },
  { id: 'earlybird', name: 'Early Bird', condition: 'Wake before 7 AM for 7 days', color: '#FDCB6E' },
  { id: 'hardworker', name: 'Hard Worker', condition: 'Complete all challenges for 5 days', color: '#E17055' },
  { id: 'streakmaster', name: 'Streak Master', condition: '30-day study streak', color: '#00B894' },
  { id: 'quizchamp', name: 'Quiz Champion', condition: 'Score 90%+ on 10 assessments', color: '#0984E3' },
  { id: 'topranker', name: 'Top Ranker', condition: 'Reach top 10 on leaderboard', color: '#FDCB6E' },
];

export default function Gamification() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1, badges: {} });
  const [completedChallenges, setCompletedChallenges] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
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
  }, [user, today]);

  const completeChallenge = async (challenge) => {
    if (completedChallenges[challenge.id]) return;
    const newCompleted = { ...completedChallenges, [challenge.id]: true };
    setCompletedChallenges(newCompleted);
    const newXp = (stats.xp || 0) + challenge.xp;
    const newLevel = Math.floor(newXp / 200) + 1;
    await update(ref(database, `users/${user.uid}/gamification`), { xp: newXp, level: newLevel });
    await fbSet(ref(database, `users/${user.uid}/gamification/dailyChallenges/${today}`), newCompleted);
    await update(ref(database, `leaderboard/${user.uid}`), { name: user.name, xp: newXp, streak: stats.streak || 0, level: newLevel });
    const achRef = push(ref(database, 'achievements'));
    await fbSet(achRef, { userId: user.uid, userName: user.name, message: `${user.name} completed "${challenge.title}" (+${challenge.xp} XP)`, timestamp: new Date().toISOString() });
  };

  const totalDailyXp = DAILY_CHALLENGES.reduce((sum, c) => sum + c.xp, 0);
  const earnedDailyXp = DAILY_CHALLENGES.filter(c => completedChallenges[c.id]).reduce((sum, c) => sum + c.xp, 0);
  const xpForNextLevel = ((stats.level || 1) * 200) - (stats.xp || 0);

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
          <div className="gam-stat-card"><div className="gam-stat-emoji"><FiAward /></div><span className="gam-stat-val">{Object.keys(stats.badges || {}).length}</span><div className="gam-stat-label">Badges Earned</div></div>
        </motion.div>

        <div className="xp-progress-section">
          <div className="xp-progress-header"><span>Level {stats.level || 1}</span><span>{stats.xp || 0} / {(stats.level || 1) * 200} XP</span><span>Level {(stats.level || 1) + 1}</span></div>
          <div className="xp-progress-bar"><div className="xp-progress-fill" style={{ width: `${((stats.xp || 0) % 200) / 200 * 100}%` }} /></div>
        </div>

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="section-title"><FiTarget /> Daily Challenges <span className="daily-xp-badge">{earnedDailyXp}/{totalDailyXp} XP</span></div>
          <div className="challenges-grid">
            {DAILY_CHALLENGES.map((ch, i) => (
              <motion.div key={ch.id} className={`challenge-card ${completedChallenges[ch.id] ? 'completed' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                <div className="ch-icon"><ch.Icon size={18} /></div>
                <div className="ch-info"><h4>{ch.title}</h4><p>{ch.description}</p></div>
                <div className="ch-xp">+{ch.xp} XP</div>
                <button className={`btn btn-sm ${completedChallenges[ch.id] ? 'btn-success' : 'btn-primary'}`} onClick={() => completeChallenge(ch)} disabled={!!completedChallenges[ch.id]}>
                  {completedChallenges[ch.id] ? <><FiCheck /> Done</> : 'Complete'}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="section-title"><FiAward /> Badge Collection</div>
          <div className="badges-grid">
            {BADGES.map(badge => {
              const earned = stats.badges && stats.badges[badge.id];
              return (
                <div key={badge.id} className={`badge-card ${earned ? 'earned' : 'locked'}`}>
                  <div className="badge-emoji" style={{ background: earned ? badge.color : 'var(--bg)', color: earned ? '#fff' : 'var(--muted)', boxShadow: 'var(--neu-small)' }}><FiAward size={20} /></div>
                  <h4>{badge.name}</h4>
                  <p>{badge.condition}</p>
                  {!earned && <FiLock className="badge-lock" />}
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="section-title"><FiTrendingUp /> Leaderboard</div>
          <div className="leaderboard-card card">
            <table className="leaderboard-table">
              <thead><tr><th>Rank</th><th>Student</th><th>XP</th><th>Streak</th><th>Level</th></tr></thead>
              <tbody>
                {(leaderboard.length > 0 ? leaderboard : [
                  { id: '1', name: 'Vivek Kumar', xp: 2450, streak: 45, level: 13 },
                  { id: '2', name: 'Priya Sharma', xp: 2100, streak: 38, level: 11 },
                  { id: '3', name: 'Rahul Patel', xp: 1890, streak: 30, level: 10 },
                  { id: '4', name: 'Ananya Singh', xp: 1650, streak: 25, level: 9 },
                  { id: '5', name: 'Karan Mehta', xp: 1400, streak: 20, level: 8 },
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

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="section-title"><FiZap /> Live Activity</div>
          <div className="activity-feed">
            {(activityFeed.length > 0 ? activityFeed : [
              { message: 'Vivek has a 45-day study streak', timestamp: new Date().toISOString() },
              { message: 'Priya earned the Hard Worker badge', timestamp: new Date().toISOString() },
              { message: 'Rahul completed all daily challenges', timestamp: new Date().toISOString() },
            ]).map((act, i) => (
              <div key={i} className="activity-item"><span>{act.message}</span><span className="activity-time">{new Date(act.timestamp).toLocaleTimeString()}</span></div>
            ))}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
