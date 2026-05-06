import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, get, onValue, set as fbSet, update, remove } from '../services/firebase';
import { api } from '../services/api';
import { generateDashboardPDF } from '../utils/pdfGenerator';
import { motion } from 'framer-motion';
import { FiEdit2, FiLogOut, FiAward, FiZap, FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiBook, FiTarget, FiDownload, FiSave, FiX, FiCheck, FiPlus, FiTrash2, FiEdit3 } from 'react-icons/fi';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import HeatmapGrid from '../components/HeatmapGrid';
import ProductivityScore from '../components/ProductivityScore';
import LearningMatrix from '../components/LearningMatrix';
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
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [editSubjects, setEditSubjects] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [todayStats, setTodayStats] = useState({ tasksCompleted: 0, totalTasks: 0, studyHours: 0, pomodoroSessions: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalEditForm, setGoalEditForm] = useState({ title: '', progress: 0 });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    
    // Load profile data from Firebase to get profilePic
    get(ref(database, `users/${user.uid}/profile`)).then(snap => {
      if (snap.exists()) {
        const profileData = snap.val();
        if (profileData.profilePic && profileData.profilePic !== user.profilePic) {
          updateUser({ profilePic: profileData.profilePic });
        }
      }
    });
    
    get(ref(database, `users/${user.uid}/gamification`)).then(s => { if (s.exists()) setStats(s.val()); });
    onValue(ref(database, `users/${user.uid}/activity`), s => { if (s.exists()) setActivityData(s.val()); });
    get(ref(database, `users/${user.uid}/subjects`)).then(s => { if (s.exists()) setSubjects(Object.values(s.val())); });
    get(ref(database, `users/${user.uid}/goals`)).then(s => { if (s.exists()) setGoals(Object.entries(s.val()).map(([id, v]) => ({ id, ...v })).slice(0, 5)); });
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
    // Today's data for productivity score
    Promise.all([
      get(ref(database, `users/${user.uid}/todos/${today}`)),
      get(ref(database, `users/${user.uid}/activity/${today}`)),
      get(ref(database, `users/${user.uid}/wellness/${today}`)),
      get(ref(database, `users/${user.uid}/assessments`)),
    ]).then(([todoSnap, actSnap, wellSnap, assSnap]) => {
      const todos = todoSnap.exists() ? Object.values(todoSnap.val()) : [];
      const act = actSnap.exists() ? actSnap.val() : {};
      const well = wellSnap.exists() ? wellSnap.val() : {};
      const assessments = assSnap.exists() ? Object.values(assSnap.val()) : [];
      const avgScore = assessments.length > 0 ? assessments.reduce((s, a) => s + (a.scorePercent || 0), 0) / assessments.length : 0;
      const weakSubjs = assessments.filter(a => (a.scorePercent || 0) < 60).map(a => a.topic).slice(0, 3).join(', ');
      const td = {
        tasksCompleted: todos.filter(t => t.completed).length,
        totalTasks: todos.length,
        studyHours: act.studyHours || 0,
        pomodoroSessions: act.pomodoroSessions || 0,
        questionsAnswered: act.questionsAnswered || 0,
        avgScore, weakSubjects: weakSubjs || 'None yet',
        sleepHours: well.sleepHours || 7, mood: well.mood || 3,
        stress: well.stress || 3, energy: well.energy || 3,
        goalsCount: goals.length, goalsOnTrack: goals.filter(g => (g.progress || 0) >= 30).length,
        streak: stats.streak || 0, xp: stats.xp || 0, level: stats.level || 1,
        loginToday: true,
      };
      setTodayStats(td);
      // Compute productivity score
      api.calculateProductivityScore({ ...td, userId: user.uid }).then(r => setScoreData(r)).catch(() => {});
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
    if (todayTasks.length === 0) w.push({ msg: 'No tasks planned for today. Start by adding some.', icon: 'warning' });
    setWarnings(w);
  }, [todayTasks, stats]);

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await api.detailedInsights({ ...todayStats, userId: user.uid });
      setInsights(res.insights || []);
    } catch { setInsights([]); }
    setInsightsLoading(false);
  };

  const saveSubjects = async () => {
    const subMap = {};
    subjects.forEach((s, i) => { subMap[i] = typeof s === 'string' ? { name: s } : s; });
    await fbSet(ref(database, `users/${user.uid}/subjects`), subMap);
    setEditSubjects(false);
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    setSubjects(p => [...p, { name: newSubject.trim() }]);
    setNewSubject('');
  };

  const removeSubject = (i) => setSubjects(p => p.filter((_, idx) => idx !== i));

  const ICON_MAP = { trend: <FiTrendingUp />, target: <FiTarget />, zap: <FiZap />, award: <FiAward />, book: <FiBook />, heart: <FiCheckCircle /> };

  const level = stats.level || 1;
  const xp = stats.xp || 0;
  const xpForLevel = level * 200;
  const xpProgress = ((xp % 200) / 200) * 100;

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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }
    
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setEditForm(f => ({ ...f, profilePic: base64String }));
      setUploadingImage(false);
    };
    reader.onerror = () => {
      alert('Failed to read image');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

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

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await remove(ref(database, `users/${user.uid}/goals/${goalId}`));
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal.id);
    setGoalEditForm({ title: goal.title, progress: goal.progress || 0 });
  };

  const handleSaveGoal = async (goalId) => {
    try {
      await update(ref(database, `users/${user.uid}/goals/${goalId}`), {
        title: goalEditForm.title,
        progress: parseInt(goalEditForm.progress) || 0
      });
      setGoals(prev => prev.map(g => 
        g.id === goalId 
          ? { ...g, title: goalEditForm.title, progress: parseInt(goalEditForm.progress) || 0 }
          : g
      ));
      setEditingGoal(null);
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert('Failed to update goal. Please try again.');
    }
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

        {/* Profile Banner - Redesigned */}
        <motion.div className="profile-banner card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="profile-content">
            <div className="profile-avatar">
              {user?.profilePic ? (
                <img src={user.profilePic} alt={user?.name || 'User'} />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'S'
              )}
            </div>
            <div className="profile-details">
              {!editing ? (
                <>
                  <h2 className="profile-name">{user?.name || 'Student'}</h2>
                  <p className="profile-email">{user?.email}</p>
                  <p className="profile-meta-line">
                    {user?.college || 'College'} · {user?.course || 'Course'} from {user?.year || 'Year'}
                  </p>
                  {user?.phone && <p className="profile-meta-line">📱 {user.phone}</p>}
                </>
              ) : (
                <div className="edit-form-inline">
                  <div className="edit-form-section">
                    <label className="edit-label">Personal Information</label>
                    <div className="edit-form-row">
                      <div className="edit-form-field">
                        <label>Full Name</label>
                        <input 
                          className="input-field" 
                          value={editForm.name || ''} 
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} 
                          placeholder="Enter your full name" 
                        />
                      </div>
                      <div className="edit-form-field">
                        <label>Email Address</label>
                        <input 
                          className="input-field" 
                          value={editForm.email || ''} 
                          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} 
                          placeholder="your.email@example.com" 
                        />
                      </div>
                    </div>
                    <div className="edit-form-row">
                      <div className="edit-form-field">
                        <label>Phone Number (with country code)</label>
                        <input 
                          className="input-field" 
                          value={editForm.phone || ''} 
                          onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} 
                          placeholder="+919876543210" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="edit-form-section">
                    <label className="edit-label">Profile Picture</label>
                    <div className="edit-form-row">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        id="profile-image-upload"
                      />
                      <label htmlFor="profile-image-upload" className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        {uploadingImage ? 'Uploading...' : '📷 Upload Photo'}
                      </label>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>or</span>
                      <input 
                        className="input-field" 
                        value={editForm.profilePic || ''} 
                        onChange={e => setEditForm(f => ({ ...f, profilePic: e.target.value }))} 
                        placeholder="Paste image URL" 
                        style={{ flex: 1 }} 
                      />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                      Max size: 2MB. Supported formats: JPG, PNG, GIF
                    </p>
                  </div>

                  <div className="edit-form-section">
                    <label className="edit-label">Academic Information</label>
                    <div className="edit-form-row">
                      <div className="edit-form-field">
                        <label>College/University</label>
                        <input 
                          className="input-field" 
                          value={editForm.college || ''} 
                          onChange={e => setEditForm(f => ({ ...f, college: e.target.value }))} 
                          placeholder="Your college name" 
                        />
                      </div>
                      <div className="edit-form-field">
                        <label>Course/Program</label>
                        <input 
                          className="input-field" 
                          value={editForm.course || ''} 
                          onChange={e => setEditForm(f => ({ ...f, course: e.target.value }))} 
                          placeholder="e.g., B.Tech CSE" 
                        />
                      </div>
                      <div className="edit-form-field">
                        <label>Year</label>
                        <input 
                          className="input-field" 
                          value={editForm.year || ''} 
                          onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))} 
                          placeholder="e.g., 2nd Year" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="profile-actions-row">
            {!editing ? (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(true); setEditForm({ name: user?.name, email: user?.email, bio: user?.bio, college: user?.college, course: user?.course, year: user?.year, profilePic: user?.profilePic, phone: user?.phone }); }}>
                  <FiEdit2 /> Edit Profile
                </button>
                <button className="btn btn-danger btn-sm" onClick={logout}><FiLogOut /> Sign Out</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary btn-sm" onClick={handleEditSave}><FiSave /> Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}><FiX /> Cancel</button>
              </>
            )}
          </div>
        </motion.div>

        {/* Level & Stats Bar */}
        <motion.div className="level-stats-bar card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="level-section">
            <div className="level-info">
              <span className="level-label">Level {level}</span>
              <span className="level-xp">{xp} / {xpForLevel} XP</span>
            </div>
            <div className="level-bar-container">
              <div className="level-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
          <div className="stats-row">
            <div className="stat-item"><FiTrendingUp /><span className="stat-val">{stats.streak || 0}</span><span className="stat-label">Streak</span></div>
            <div className="stat-item"><FiZap /><span className="stat-val">{xp}</span><span className="stat-label">XP</span></div>
            <div className="stat-item"><FiAward /><span className="stat-val">{Object.keys(stats.badges || {}).length}</span><span className="stat-label">Badges</span></div>
            <div className="stat-item"><FiCheck /><span className="stat-val">{todayStats.tasksCompleted}</span><span className="stat-label">Today</span></div>
          </div>
        </motion.div>

        {/* Quick Today Stats */}
        <motion.div className="today-stats-row" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {[
            { label: 'Study Hours', val: `${todayStats.studyHours.toFixed(1)}h`, icon: <FiBook />, color: '#6C63FF' },
            { label: 'Pomodoros', val: todayStats.pomodoroSessions, icon: <FiTarget />, color: '#E17055' },
            { label: 'Tasks Done', val: `${todayStats.tasksCompleted}/${todayStats.totalTasks}`, icon: <FiCheck />, color: '#00B894' },
            { label: 'Questions', val: todayStats.questionsAnswered, icon: <FiBook />, color: '#0984E3' },
          ].map((s, i) => (
            <div key={i} className="today-stat-card card">
              <div className="ts-icon" style={{ color: s.color }}>{s.icon}</div>
              <div className="ts-val" style={{ color: s.color }}>{s.val}</div>
              <div className="ts-label">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Subjects Section */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="section-header-row">
            <h2 className="section-title">My Subjects</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditSubjects(e => !e)}>
              {editSubjects ? <><FiCheck /> Save</> : <><FiEdit2 /> Edit</>}
            </button>
            {editSubjects && <button className="btn btn-primary btn-sm" onClick={saveSubjects}>Save Changes</button>}
          </div>
          <div className="subjects-grid">
            {subjects.map((s, i) => (
              <div key={i} className="subject-tag">
                {typeof s === 'string' ? s : s.name}
                {editSubjects && <button onClick={() => removeSubject(i)}><FiX size={10} /></button>}
              </div>
            ))}
            {editSubjects && (
              <div className="subject-add-row">
                <input className="input-field" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Add subject..." onKeyDown={e => e.key === 'Enter' && addSubject()} style={{ fontSize: 13, padding: '6px 12px' }} />
                <button className="btn btn-secondary btn-sm" onClick={addSubject}><FiPlus /></button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Productivity Score */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ProductivityScore scoreData={scoreData} />
        </motion.div>

        {/* GitHub-style Heatmap */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <HeatmapGrid activityData={activityData} />
        </motion.div>

        {/* Learning Matrix */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="card" style={{ padding: 24 }}>
            <LearningMatrix />
          </div>
        </motion.div>

        {warnings.length > 0 && (
          <motion.div className="warnings-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
            {warnings.map((w, i) => (
              <div key={i} className={`warning-card ${w.type}`}>
                {w.type === 'warning' ? <FiAlertTriangle /> : <FiCheckCircle />}
                <span>{w.msg}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Productivity Charts */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
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

        {/* Goals Section */}
        {goals.length > 0 && (
          <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="section-title">Active Goals</h2>
            <div className="goals-overview">
              {goals.map(g => (
                <div key={g.id} className="goal-overview-card card">
                  {editingGoal === g.id ? (
                    <div className="goal-edit-mode">
                      <input 
                        className="input-field" 
                        value={goalEditForm.title} 
                        onChange={e => setGoalEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Goal title"
                        style={{ marginBottom: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)' }}>Progress:</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          value={goalEditForm.progress} 
                          onChange={e => setGoalEditForm(f => ({ ...f, progress: e.target.value }))}
                          min="0"
                          max="100"
                          style={{ width: 80 }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>%</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleSaveGoal(g.id)}>
                          <FiCheck /> Save
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingGoal(null)}>
                          <FiX /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="go-header">
                        <h4>{g.title}</h4>
                        <div className="goal-actions">
                          <button 
                            className="btn-icon-small" 
                            onClick={() => handleEditGoal(g)}
                            title="Edit goal"
                          >
                            <FiEdit3 size={14} />
                          </button>
                          <button 
                            className="btn-icon-small btn-icon-danger" 
                            onClick={() => handleDeleteGoal(g.id)}
                            title="Delete goal"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {g.plan?.timeline && <span className="go-timeline">{typeof g.plan.timeline === 'string' ? g.plan.timeline : JSON.stringify(g.plan.timeline)}</span>}
                      <div className="go-bar"><div className="go-fill" style={{ width: `${g.progress || 0}%` }} /></div>
                      <div className="go-meta"><span>{g.progress || 0}% complete</span>{g.plan?.phases?.length && <span>{g.plan.phases.length} phases</span>}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Insights (Detailed) */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="insights-header">
            <h2 className="section-title">AI Productivity Insights</h2>
            <button className="btn btn-primary btn-sm" onClick={loadInsights} disabled={insightsLoading}>
              {insightsLoading ? 'Analyzing...' : <><FiZap /> Generate Insights</>}
            </button>
          </div>
          {insights.length > 0 ? (
            <div className="insights-grid">
              {insights.map((ins, i) => (
                <motion.div key={i} className="insight-card card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                  <div className="insight-icon">{ICON_MAP[ins.icon] || <FiZap />}</div>
                  <h4>{typeof ins.title === 'string' ? ins.title : 'Insight'}</h4>
                  <p>{typeof ins.paragraph === 'string' ? ins.paragraph : JSON.stringify(ins.paragraph)}</p>
                  {ins.actionItem && <div className="insight-action"><FiTarget /> {typeof ins.actionItem === 'string' ? ins.actionItem : JSON.stringify(ins.actionItem)}</div>}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card insights-empty">
              <p>Click "Generate Insights" to get personalized AI analysis based on your real activity data.</p>
            </div>
          )}
        </motion.div>

        {/* AI Suggestions (Quick) */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="section-title"><FiBook /> AI Suggestions</h2>
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
