import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, get, onValue, set as fbSet } from '../services/firebase';
import { api } from '../services/api';
import { generateDashboardPDF } from '../utils/pdfGenerator';
import { motion } from 'framer-motion';
import { FiUser, FiEdit2, FiLogOut, FiAward, FiZap, FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiBook, FiTarget, FiDownload, FiSave, FiX } from 'react-icons/fi';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import HeatmapGrid from '../components/HeatmapGrid';
import Footer from '../components/Footer';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth();
  const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1, badges: {} });
  const [activityData, setActivityData] = useState({});
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [todayTasks, setTodayTasks] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    get(ref(database, `users/${user.uid}/gamification`)).then(s => { if (s.exists()) setStats(s.val()); });
    onValue(ref(database, `users/${user.uid}/activity`), s => { if (s.exists()) setActivityData(s.val()); });
    onValue(ref(database, `users/${user.uid}/todos/${today}`), s => {
      if (s.exists()) { const d = s.val(); setTodayTasks(Object.entries(d).map(([id, v]) => ({ id, ...v }))); }
    });
    get(ref(database, `users/${user.uid}/assessments`)).then(s => {
      if (s.exists()) {
        const data = s.val();
        const items = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
        setAssessmentHistory(items);
      }
    });
  }, [user, today]);

  // Fetch AI suggestions
  useEffect(() => {
    if (!user?.uid) return;
    const completedTasks = todayTasks.filter(t => t.completed).length;
    const fetchSuggestions = async () => {
      try {
        const res = await api.dashboardSuggestions({
          xp: stats.xp || 0, level: stats.level || 1, streak: stats.streak || 0,
          tasksCompleted: completedTasks, totalTasks: todayTasks.length,
          studyHours: chartData.reduce((s, d) => s + (d.hours || 0), 0) / 7,
          avgScore: chartData.reduce((s, d) => s + (d.score || 0), 0) / 7,
        });
        if (res.suggestions) setAiSuggestions(res.suggestions);
      } catch {
        setAiSuggestions([
          { title: 'Study Consistency', suggestion: 'Maintain your study streak for better retention.', icon: 'trend' },
          { title: 'Focus Areas', suggestion: 'Spend extra time on subjects with lower scores.', icon: 'target' },
          { title: 'Peak Hours', suggestion: 'Schedule hard subjects during your peak focus window.', icon: 'zap' },
          { title: 'Daily Goals', suggestion: 'Complete challenges daily to earn XP and level up.', icon: 'award' },
        ]);
      }
    };
    fetchSuggestions();
  }, [stats, todayTasks.length]);

  useEffect(() => {
    const w = [];
    const incomplete = todayTasks.filter(t => !t.completed);
    if (incomplete.length > 0) w.push({ msg: `${incomplete.length} task${incomplete.length > 1 ? 's' : ''} remaining today`, type: 'warning' });
    if ((stats.streak || 0) > 0) w.push({ msg: `${stats.streak}-day streak active — keep it going`, type: 'info' });
    if (todayTasks.length === 0) w.push({ msg: 'No tasks planned for today. Start by adding some.', type: 'warning' });
    setWarnings(w);
  }, [todayTasks, stats]);

  // Real chart data from Firebase activity
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const act = activityData[key] || {};
    return {
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      hours: act.studyHours || 0,
      tasks: act.tasksCompleted || 0,
      score: act.avgScore || 0,
    };
  });

  // Subject data from Firebase or assessment history
  const subjectData = (() => {
    const subjects = {};
    assessmentHistory.forEach(a => {
      if (a.topic) {
        if (!subjects[a.topic]) subjects[a.topic] = { total: 0, count: 0 };
        subjects[a.topic].total += (a.scorePercent || 0);
        subjects[a.topic].count += 1;
      }
    });
    const entries = Object.entries(subjects).map(([subject, d]) => ({
      subject, progress: Math.round(d.total / d.count)
    }));
    if (entries.length >= 3) return entries.slice(0, 6);
    return [
      { subject: 'Math', progress: 75 }, { subject: 'Physics', progress: 60 },
      { subject: 'DSA', progress: 85 }, { subject: 'Web Dev', progress: 90 },
      { subject: 'Networks', progress: 45 },
    ];
  })();

  const handleEditSave = async () => {
    await fbSet(ref(database, `users/${user.uid}/profile`), { ...user, ...editForm });
    updateUser(editForm);
    setEditing(false);
  };

  const handleExportPDF = () => {
    const suggestionTexts = aiSuggestions.map(s => typeof s === 'string' ? s : s.suggestion || '');
    generateDashboardPDF({
      user, stats, chartData, subjectData, warnings, todayTasks,
      suggestions: suggestionTexts,
    });
  };

  const getIconForSuggestion = (icon) => {
    if (icon === 'trend') return <FiTrendingUp />;
    if (icon === 'target') return <FiTarget />;
    if (icon === 'zap') return <FiZap />;
    return <FiAward />;
  };

  const tt = { background: 'var(--bg)', border: 'none', borderRadius: '12px', boxShadow: 'var(--neu-small)', fontSize: '13px', color: 'var(--fg)' };

  return (
    <div className="page">
      <div className="container">
        <motion.div className="page-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div><h1>Dashboard</h1><p>Your complete productivity overview</p></div>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF}><FiDownload /> Export Report PDF</button>
          </div>
        </motion.div>

        <div className="dash-top-grid">
          <motion.div className="profile-card card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="profile-header">
              <div className="profile-avatar-lg">{user?.profilePic ? <img src={user.profilePic} alt="" /> : <span>{user?.name?.charAt(0) || 'U'}</span>}</div>
              <div className="profile-info"><h2>{user?.name}</h2><p>{user?.email}</p><p className="profile-meta">{user?.college} · {user?.course} · {user?.year}</p></div>
            </div>
            <div className="profile-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(!editing); setEditForm({ name: user?.name, bio: user?.bio, college: user?.college, course: user?.course, year: user?.year }); }}>
                {editing ? <><FiX /> Cancel</> : <><FiEdit2 /> Edit Profile</>}
              </button>
              <button className="btn btn-danger btn-sm" onClick={logout}><FiLogOut /> Sign Out</button>
            </div>
            {editing && (
              <div className="edit-form" style={{ marginTop: 16 }}>
                <input className="input-field" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                <textarea className="input-field" value={editForm.bio || ''} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio" rows={2} style={{ marginTop: 8 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                  <input className="input-field" value={editForm.college || ''} onChange={e => setEditForm(f => ({ ...f, college: e.target.value }))} placeholder="College" />
                  <input className="input-field" value={editForm.course || ''} onChange={e => setEditForm(f => ({ ...f, course: e.target.value }))} placeholder="Course" />
                  <input className="input-field" value={editForm.year || ''} onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))} placeholder="Year" />
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleEditSave}><FiSave /> Save Changes</button>
              </div>
            )}
          </motion.div>

          <motion.div className="stats-sidebar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mini-stat"><div className="ms-icon"><FiZap /></div><div><span className="ms-val">{stats.xp || 0}</span><span className="ms-label">Total XP</span></div></div>
            <div className="mini-stat"><div className="ms-icon"><FiTrendingUp /></div><div><span className="ms-val">{stats.streak || 0}</span><span className="ms-label">Day Streak</span></div></div>
            <div className="mini-stat"><div className="ms-icon"><FiTarget /></div><div><span className="ms-val">Lvl {stats.level || 1}</span><span className="ms-label">Level</span></div></div>
            <div className="mini-stat"><div className="ms-icon"><FiAward /></div><div><span className="ms-val">{Object.keys(stats.badges || {}).length}</span><span className="ms-label">Badges</span></div></div>
          </motion.div>
        </div>

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <HeatmapGrid activityData={activityData} />
        </motion.div>

        {warnings.length > 0 && (
          <motion.div className="warnings-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {warnings.map((w, i) => (
              <div key={i} className={`warning-card ${w.type}`}>
                {w.type === 'warning' ? <FiAlertTriangle /> : <FiCheckCircle />}
                <span>{w.msg}</span>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="section-title"><FiTrendingUp /> Productivity Charts</h2>
          <div className="charts-grid">
            <div className="chart-card card">
              <h3>Study Hours — 7 Days</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" /><XAxis dataKey="day" fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><YAxis fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tt} /><Area type="monotone" dataKey="hours" stroke="#6C63FF" fill="rgba(108,99,255,0.1)" strokeWidth={2} /></AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card card">
              <h3>Subject Progress</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subjectData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" /><XAxis dataKey="subject" fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><YAxis fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tt} /><Bar dataKey="progress" fill="#38B2AC" radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card card">
              <h3>Assessment Scores</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" /><XAxis dataKey="day" fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><YAxis fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tt} /><Line type="monotone" dataKey="score" stroke="#E17055" strokeWidth={2} dot={{ fill: '#E17055', r: 4 }} /></LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="section-title"><FiBook /> AI Insights</h2>
          <div className="suggestions-grid">
            {(aiSuggestions.length > 0 ? aiSuggestions : [
              { suggestion: 'Loading AI suggestions...', icon: 'zap' }
            ]).map((s, i) => (
              <div key={i} className="suggestion-card">
                <div className="suggestion-icon">{getIconForSuggestion(s.icon)}</div>
                <div>
                  {s.title && <strong style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--fg)' }}>{s.title}</strong>}
                  <p>{typeof s === 'string' ? s : s.suggestion || ''}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
