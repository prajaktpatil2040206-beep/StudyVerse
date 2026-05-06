import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, get, onValue } from '../services/firebase';
import { motion } from 'framer-motion';
import { FiUser, FiEdit2, FiLogOut, FiAward, FiZap, FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiBook, FiTarget } from 'react-icons/fi';
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
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    get(ref(database, `users/${user.uid}/gamification`)).then(s => { if (s.exists()) setStats(s.val()); });
    get(ref(database, `users/${user.uid}/activity`)).then(s => { if (s.exists()) setActivityData(s.val()); });
    onValue(ref(database, `users/${user.uid}/todos/${today}`), s => {
      if (s.exists()) { const d = s.val(); setTodayTasks(Object.entries(d).map(([id, v]) => ({ id, ...v }))); }
    });
  }, [user, today]);

  useEffect(() => {
    const w = [];
    const incomplete = todayTasks.filter(t => !t.completed);
    if (incomplete.length > 0) w.push({ msg: `${incomplete.length} task${incomplete.length > 1 ? 's' : ''} remaining today`, type: 'warning' });
    if ((stats.streak || 0) > 0) w.push({ msg: `${stats.streak}-day streak active — keep it going`, type: 'info' });
    if (todayTasks.length === 0) w.push({ msg: 'No tasks planned for today. Start by adding some.', type: 'warning' });
    setWarnings(w);
  }, [todayTasks, stats]);

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const act = activityData[key] || {};
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), hours: act.studyHours || Math.random() * 6, tasks: act.tasksCompleted || Math.floor(Math.random() * 8), score: act.avgScore || Math.floor(50 + Math.random() * 50) };
  });

  const subjectData = [
    { subject: 'Math', progress: 75 }, { subject: 'Physics', progress: 60 },
    { subject: 'DSA', progress: 85 }, { subject: 'Web Dev', progress: 90 },
    { subject: 'Networks', progress: 45 },
  ];

  const handleEditSave = async () => {
    const { set: fbSet } = await import('../services/firebase');
    await fbSet(ref(database, `users/${user.uid}/profile`), { ...user, ...editForm });
    updateUser(editForm);
    setEditing(false);
  };

  const tt = { background: '#E0E5EC', border: 'none', borderRadius: '12px', boxShadow: '5px 5px 10px rgb(163,177,198,0.6),-5px -5px 10px rgba(255,255,255,0.5)', fontSize: '13px', color: '#3D4852' };

  return (
    <div className="page">
      <div className="container">
        <motion.div className="page-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1>Dashboard</h1><p>Your complete productivity overview</p>
        </motion.div>

        <div className="dash-top-grid">
          <motion.div className="profile-card card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="profile-header">
              <div className="profile-avatar-lg">{user?.profilePic ? <img src={user.profilePic} alt="" /> : <span>{user?.name?.charAt(0) || 'U'}</span>}</div>
              <div className="profile-info"><h2>{user?.name}</h2><p>{user?.email}</p><p className="profile-meta">{user?.college} · {user?.course} · {user?.year}</p></div>
            </div>
            <div className="profile-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(!editing); setEditForm({ name: user?.name, bio: user?.bio }); }}><FiEdit2 /> Edit Profile</button>
              <button className="btn btn-danger btn-sm" onClick={logout}><FiLogOut /> Sign Out</button>
            </div>
            {editing && (
              <div className="edit-form" style={{ marginTop: 16 }}>
                <input className="input-field" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                <textarea className="input-field" value={editForm.bio || ''} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio" rows={2} style={{ marginTop: 8 }} />
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleEditSave}>Save Changes</button>
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

        <div className="charts-grid">
          <motion.div className="chart-card card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3>Study Hours — 7 Days</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" /><XAxis dataKey="day" fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><YAxis fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tt} /><Area type="monotone" dataKey="hours" stroke="#6C63FF" fill="rgba(108,99,255,0.1)" strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div className="chart-card card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3>Subject Progress</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" /><XAxis dataKey="subject" fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><YAxis fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tt} /><Bar dataKey="progress" fill="#38B2AC" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div className="chart-card card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <h3>Assessment Scores</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" /><XAxis dataKey="day" fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><YAxis fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tt} /><Line type="monotone" dataKey="score" stroke="#E17055" strokeWidth={2} dot={{ fill: '#E17055', r: 4 }} /></LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="section-title"><FiBook /> AI Insights</h2>
          <div className="suggestions-grid">
            <div className="suggestion-card"><div className="suggestion-icon"><FiTrendingUp /></div><p>Study consistency improved 15% this week. Maintain the momentum.</p></div>
            <div className="suggestion-card"><div className="suggestion-icon"><FiTarget /></div><p>Networks scores are below average. Schedule additional practice sessions.</p></div>
            <div className="suggestion-card"><div className="suggestion-icon"><FiZap /></div><p>Your peak focus window is in the evening. Schedule challenging subjects then.</p></div>
            <div className="suggestion-card"><div className="suggestion-icon"><FiAward /></div><p>Complete daily challenges consistently to level up and earn milestone badges.</p></div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
