import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, set as fbSet, push, get } from '../services/firebase';
import { api } from '../services/api';
import { notificationHelper } from '../services/notificationHelper';
import { motion } from 'framer-motion';
import { FiCalendar, FiTarget, FiMessageCircle, FiFileText, FiSend, FiMic, FiDownload, FiRefreshCw, FiCheck, FiPlus, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { generateTimetablePDF, generateAssessmentPDF } from '../utils/pdfGenerator';
import { generateGoalPlanPDF } from '../utils/goalPlanPDF';
import MCQQuiz from '../components/MCQQuiz';
import Footer from '../components/Footer';
import './Mentor.css';

const TABS = [
  { id: 'timetable', label: 'Timetable', icon: <FiCalendar /> },
  { id: 'goals', label: 'Goals', icon: <FiTarget /> },
  { id: 'teacher', label: 'AI Teacher', icon: <FiMessageCircle /> },
  { id: 'assessment', label: 'Assessment', icon: <FiFileText /> },
];

const PREDEFINED_SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','Computer Science','DSA','Web Development','Machine Learning','Economics','English','History','Geography'];

export default function Mentor() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('timetable');
  return (
    <div className="page">
      <div className="container">
        <motion.div className="page-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1>AI Mentor</h1>
          <p>Your personal AI-powered learning companion</p>
        </motion.div>
        <div className="mentor-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`mentor-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="mentor-content">
          {activeTab === 'timetable' && <TimetableGen user={user} />}
          {activeTab === 'goals' && <GoalSetting user={user} />}
          {activeTab === 'teacher' && <TeacherChat user={user} />}
          {activeTab === 'assessment' && <Assessment user={user} />}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ─── TIMETABLE ───────────────────────────────────────────────────────────────
function TimetableGen({ user }) {
  const [prompt, setPrompt] = useState('');
  const [form, setForm] = useState({ wakeUp: '07:00', sleepTime: '23:00', peakStudy: 'Morning', collegeStart: '', collegeEnd: '', events: '', subjects: '5' });
  const [toughSubjects, setToughSubjects] = useState([]);
  const [customSubject, setCustomSubject] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  const toggleSubject = (s) => setToughSubjects(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const addCustom = () => { if (customSubject.trim()) { toggleSubject(customSubject.trim()); setCustomSubject(''); } };

  const generate = async () => {
    setLoading(true);
    try {
      const payload = { ...form, toughSubjects: toughSubjects.join(', '), prompt, userId: user?.uid };
      const res = await api.generateTimetableUnified(payload);
      setTimetable(res.timetable || res);
    } catch {
      setTimetable({ daily: [
        { time: `${form.wakeUp} - ${form.wakeUp.replace(/(\d+)/, h => String((+h+1)%24).padStart(2,'0'))}`, subject: 'Morning Routine', type: 'routine' },
        { time: '09:00 - 10:30', subject: toughSubjects[0] || 'Deep Study', type: 'study' },
        { time: '10:30 - 11:00', subject: 'Break', type: 'break' },
        { time: '11:00 - 12:30', subject: 'Study Block 2', type: 'study' },
        { time: '12:30 - 13:30', subject: 'Lunch', type: 'routine' },
        { time: '13:30 - 15:30', subject: form.collegeStart ? 'College' : 'Study Block 3', type: form.collegeStart ? 'college' : 'study' },
        { time: '15:30 - 17:00', subject: 'Practice', type: 'study' },
        { time: '19:00 - 20:30', subject: 'Evening Study', type: 'study' },
        { time: `21:30 - ${form.sleepTime}`, subject: 'Wind Down', type: 'routine' },
      ]});
    }
    setLoading(false); setApproved(false);
  };

  const approve = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (timetable?.daily) {
      await fbSet(ref(database, `users/${user.uid}/timetable/daily/${today}`), { slots: timetable.daily, statuses: {} });
      
      // Send notification and SMS
      const userPhone = user?.phone || user?.phoneNumber;
      const userEmail = user?.email;
      try {
        await notificationHelper.notifyTimetableReady(user.uid, userPhone, userEmail, timetable);
        console.log('✅ Timetable notification sent');
      } catch (error) {
        console.error('❌ Timetable notification failed:', error);
      }
    }
    setApproved(true);
  };

  if (!timetable) return (
    <div className="card">
      <h3>Generate Smart Timetable</h3>
      <p className="form-subtitle">Describe your day first, then fill in the details below</p>

      <div className="input-group" style={{ marginTop: 16 }}>
        <label>📝 Describe your ideal day (optional)</label>
        <textarea className="input-field" rows={3} placeholder="e.g. I wake at 7 AM, have college from 9-1 PM, want to study Math in evening..." value={prompt} onChange={e => setPrompt(e.target.value)} />
      </div>

      <div className="tt-divider"><span>+ Structured Details</span></div>

      <div className="mentor-form-grid">
        <div className="input-group">
          <label>⏰ Wake Up Time</label>
          <input type="time" className="input-field" value={form.wakeUp} onChange={e => setForm(f => ({ ...f, wakeUp: e.target.value }))} />
        </div>
        <div className="input-group">
          <label>🌙 Sleep Time</label>
          <input type="time" className="input-field" value={form.sleepTime} onChange={e => setForm(f => ({ ...f, sleepTime: e.target.value }))} />
        </div>
        <div className="input-group">
          <label>🎓 College Start</label>
          <input type="time" className="input-field" value={form.collegeStart} onChange={e => setForm(f => ({ ...f, collegeStart: e.target.value }))} />
        </div>
        <div className="input-group">
          <label>🎓 College End</label>
          <input type="time" className="input-field" value={form.collegeEnd} onChange={e => setForm(f => ({ ...f, collegeEnd: e.target.value }))} />
        </div>
        <div className="input-group">
          <label>Peak Study Time</label>
          <select className="input-field" value={form.peakStudy} onChange={e => setForm(f => ({ ...f, peakStudy: e.target.value }))}>
            {['Morning','Afternoon','Evening','Night'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>Total Subjects</label>
          <input type="number" className="input-field" value={form.subjects} min="1" max="12" onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))} />
        </div>
      </div>

      <div className="input-group" style={{ marginTop: 8 }}>
        <label>💪 Tough Subjects (select + add your own)</label>
        <div className="subject-checkboxes">
          {PREDEFINED_SUBJECTS.map(s => (
            <button key={s} className={`subject-chip ${toughSubjects.includes(s) ? 'selected' : ''}`} onClick={() => toggleSubject(s)}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="input-field" value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="Add your subject (e.g. DBMS)" onKeyDown={e => e.key === 'Enter' && addCustom()} />
          <button className="btn btn-secondary btn-sm" onClick={addCustom}><FiPlus /> Add</button>
        </div>
        {toughSubjects.length > 0 && <div className="selected-chips">{toughSubjects.map(s => <span key={s} className="chip-selected">{s} <button onClick={() => toggleSubject(s)}>×</button></span>)}</div>}
      </div>

      <div className="input-group" style={{ marginTop: 8 }}>
        <label>📋 Events / Notes</label>
        <textarea className="input-field" rows={2} placeholder="e.g. Exam on Friday, project deadline next week, want to exercise at 6 PM..." value={form.events} onChange={e => setForm(f => ({ ...f, events: e.target.value }))} />
      </div>

      <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
        {loading ? '🤖 AI is generating your timetable...' : '✨ Generate Timetable'}
      </button>
    </div>
  );

  return (
    <div id="tt-result">
      <div className="tt-result-header">
        <h3>Your AI-Generated Timetable</h3>
        <div className="tt-result-actions">
          {!approved ? <button className="btn btn-success btn-sm" onClick={approve}><FiCheck /> Approve & Save</button> : <span className="badge badge-success">✓ Saved</span>}
          <button className="btn btn-secondary btn-sm" onClick={() => generateTimetablePDF(timetable, form)}><FiDownload /> PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setTimetable(null)}><FiRefreshCw /> Rebuild</button>
        </div>
      </div>
      <table className="timetable-table" style={{ width: '100%' }}>
        <thead><tr><th>Time</th><th>Activity</th><th>Type</th></tr></thead>
        <tbody>
          {(timetable.daily || []).map((s, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{s.time}</td>
              <td>{s.subject}</td>
              <td><span className={`badge badge-${s.type === 'study' ? 'primary' : s.type === 'college' ? 'warning' : 'success'}`}>{s.type}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── GOAL SETTING ─────────────────────────────────────────────────────────────
function GoalSetting({ user }) {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!user?.uid) return;
    get(ref(database, `users/${user.uid}/goals`)).then(snap => {
      if (snap.exists()) setGoals(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).reverse());
    });
  }, [user]);

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    setLoading(true);
    try {
      const res = await api.generateGoalPlan({ goal: newGoal, userId: user.uid });
      const plan = res.plan || {};
      const goalRef = push(ref(database, `users/${user.uid}/goals`));
      const d = { title: newGoal, plan, progress: 0, createdAt: new Date().toISOString() };
      await fbSet(goalRef, d);
      setGoals(p => [{ id: goalRef.key, ...d }, ...p]);
      setNewGoal('');
    } catch {}
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Set a Goal</h3>
        <p className="form-subtitle">AI generates a full structured implementation plan</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <input className="input-field" style={{ flex: 1 }} placeholder="e.g. Master Data Structures in 8 weeks" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} />
          <button className="btn btn-primary" onClick={addGoal} disabled={loading}>{loading ? 'Planning...' : '🧠 AI Plan'}</button>
        </div>
      </div>

      <div className="goals-list">
        {goals.map(g => (
          <div key={g.id} className="goal-card card">
            <div className="goal-header" onClick={() => setExpanded(e => ({ ...e, [g.id]: !e[g.id] }))}>
              <div>
                <h4>{g.title}</h4>
                {g.plan?.timeline && <span className="goal-timeline">⏱ {typeof g.plan.timeline === 'string' ? g.plan.timeline : JSON.stringify(g.plan.timeline)}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {g.plan && <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); generateGoalPlanPDF(g.title, g.plan); }}><FiDownload /> PDF</button>}
                {expanded[g.id] ? <FiChevronUp /> : <FiChevronDown />}
              </div>
            </div>

            <div className="goal-progress-bar"><div className="goal-progress-fill" style={{ width: `${g.progress || 0}%` }} /></div>

            {expanded[g.id] && g.plan && (
              <div className="goal-plan-detail">
                {g.plan.overview && (
                  <div className="plan-section">
                    <h5>📖 Overview</h5>
                    <p className="plan-overview">{typeof g.plan.overview === 'string' ? g.plan.overview : JSON.stringify(g.plan.overview)}</p>
                  </div>
                )}
                
                {g.plan.phases?.length > 0 && (
                  <div className="plan-section">
                    <h5>📋 Implementation Phases</h5>
                    <div className="plan-phases">
                      {g.plan.phases.map((ph, i) => {
                        let tasks = ph.tasks || [];
                        if (!Array.isArray(tasks)) {
                          tasks = Object.values(tasks);
                        }
                        return (
                          <div key={i} className="phase-item">
                            <div className="phase-header">
                              <span className="phase-num">Phase {ph.phase}</span>
                              <strong>{ph.name}</strong>
                              <span className="phase-dur">{ph.duration}</span>
                            </div>
                            <ul className="phase-tasks">
                              {tasks.map((t, j) => (
                                <li key={j}>{typeof t === 'string' ? t : JSON.stringify(t)}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {g.plan.milestones?.length > 0 && (
                  <div className="plan-section">
                    <h5>🎯 Key Milestones</h5>
                    <div className="plan-milestones">
                      {g.plan.milestones.map((m, i) => {
                        const milestoneText = typeof m.milestone === 'string' ? m.milestone : JSON.stringify(m.milestone);
                        return (
                          <div key={i} className="milestone-item">
                            <span className="milestone-week">Week {m.week}</span>
                            <span className="milestone-text">{milestoneText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {g.plan.resources?.length > 0 && (
                  <div className="plan-section">
                    <h5>📚 Recommended Resources</h5>
                    <div className="plan-resources">
                      {g.plan.resources.map((r, i) => (
                        <div key={i} className="resource-item">
                          <span className="resource-type">{r.type}</span>
                          <div className="resource-content">
                            <strong>{r.name}</strong>
                            <p>{r.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {g.plan.dailyRoutine && (
                  <div className="plan-section">
                    <h5>📅 Daily Routine</h5>
                    <p className="plan-routine">{typeof g.plan.dailyRoutine === 'string' ? g.plan.dailyRoutine : JSON.stringify(g.plan.dailyRoutine)}</p>
                  </div>
                )}
                
                {g.plan.successMetrics?.length > 0 && (
                  <div className="plan-section">
                    <h5>✅ Success Metrics</h5>
                    <ul className="plan-metrics">
                      {g.plan.successMetrics.map((metric, i) => (
                        <li key={i}>{typeof metric === 'string' ? metric : JSON.stringify(metric)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {goals.length === 0 && <div className="todo-empty"><p>No goals yet. Add one above to get a full AI implementation plan.</p></div>}
      </div>
    </motion.div>
  );
}

// ─── TEACHER CHAT ─────────────────────────────────────────────────────────────
function TeacherChat({ user }) {
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm your AI teacher. Ask me anything about your studies.` }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const distress = ['suicide','kill myself','want to die','end my life','self harm'];

  const send = async () => {
    if (!input.trim()) return;
    setMsgs(p => [...p, { role: 'user', content: input }]);
    const msg = input; setInput(''); setLoading(true);
    if (distress.some(k => msg.toLowerCase().includes(k))) {
      setMsgs(p => [...p, { role: 'assistant', content: "I'm concerned about you.\n\nPlease reach out:\n- iCall: 9152987821\n- Vandrevala: 1860-2662-345\n- AASRA: 9820466626\n\nYou matter. Please talk to someone." }]);
      setLoading(false); return;
    }
    try { const r = await api.chat({ message: msg, history: msgs.slice(-10), userId: user.uid }); setMsgs(p => [...p, { role: 'assistant', content: r.response || 'Let me think about that...' }]); }
    catch { setMsgs(p => [...p, { role: 'assistant', content: 'Backend not connected. Please ensure the server is running.' }]); }
    setLoading(false);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { alert('Voice input requires Chrome'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.lang = 'en-US';
    r.onresult = e => { setInput(p => p + e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false); r.onend = () => setListening(false);
    r.start(); setListening(true);
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {msgs.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-avatar">{m.role === 'assistant' ? 'AI' : user?.name?.charAt(0) || 'U'}</div>
            <div className="chat-bubble"><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{m.content}</pre></div>
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><div className="chat-avatar">AI</div><div className="chat-bubble typing"><span /><span /><span /></div></div>}
      </div>
      <div className="chat-input-bar">
        <button className={`chat-voice-btn ${listening ? 'active' : ''}`} onClick={toggleVoice}><FiMic /></button>
        <input className="chat-input" placeholder="Ask anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
        <button className="chat-send-btn" onClick={send} disabled={loading || !input.trim()}><FiSend /></button>
      </div>
    </div>
  );
}

// ─── ASSESSMENT ───────────────────────────────────────────────────────────────
const QUESTION_COUNTS = [10, 15, 25, 50];
const TIMER_MAP = { 10: 20, 15: 30, 25: 45, 50: 90 };

function Assessment({ user }) {
  const [step, setStep] = useState('setup');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const start = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const domain = user?.course || '';
      const res = await api.mixedQuestions({ topic, count, userDomain: domain, userId: user.uid });
      setQuestions(res.questions || []);
    } catch {
      setQuestions(Array.from({ length: count }, (_, i) => ({
        question: `Question ${i + 1}: Explain a key concept from ${topic}`, type: i % 3 === 0 ? 'text' : 'mcq',
        options: i % 3 !== 0 ? { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' } : undefined,
        correct: 'A', points: 10,
      })));
    }
    setStep('quiz'); setLoading(false);
  };

  const handleFinish = async (answers) => {
    setLoading(true); setStep('evaluating');
    try {
      const res = await api.evaluateMCQ({ topic, quizType: 'assessment', questions, answers, userId: user.uid });
      const total = res.totalScore || 0;
      setTotalScore(total); setResults(res.results || []);
      const assessRef = push(ref(database, `users/${user.uid}/assessments`));
      await fbSet(assessRef, { topic, results: res.results, totalScore: total, maxScore: res.maxScore, scorePercent: res.scorePercent, questionCount: count, date: new Date().toISOString() });
      const today = new Date().toISOString().split('T')[0];
      const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
      const act = actSnap.exists() ? actSnap.val() : {};
      await fbSet(ref(database, `users/${user.uid}/activity/${today}`), { ...act, avgScore: res.scorePercent, questionsAnswered: (act.questionsAnswered || 0) + count });
    } catch { setTotalScore(0); setResults([]); }
    setStep('results'); setLoading(false);
  };

  if (step === 'setup') return (
    <div className="card">
      <h3>AI Assessment Platform</h3>
      <p className="form-subtitle">Mixed MCQ + written questions generated by AI. Supports voice answers and text-to-speech.</p>
      <div className="input-group" style={{ marginTop: 16 }}>
        <label>Topic</label>
        <input className="input-field" placeholder="e.g. Java OOP, React Hooks, Binary Trees..." value={topic} onChange={e => setTopic(e.target.value)} />
      </div>
      <div className="input-group" style={{ marginTop: 12 }}>
        <label>Number of Questions</label>
        <div className="count-selector">
          {QUESTION_COUNTS.map(c => (
            <button key={c} className={`count-btn ${count === c ? 'selected' : ''}`} onClick={() => setCount(c)}>
              <div className="count-num">{c}</div>
              <div className="count-time">{TIMER_MAP[c]} min</div>
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-lg" style={{ marginTop: 20, width: '100%' }} onClick={start} disabled={loading || !topic.trim()}>
        {loading ? `Generating ${count} questions...` : `Start Assessment (${count}Q / ${TIMER_MAP[count]} min)`}
      </button>
    </div>
  );

  if (step === 'quiz') return (
    <MCQQuiz questions={questions} onFinish={handleFinish} onCancel={() => setStep('setup')} />
  );

  if (step === 'evaluating') return (
    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
      <div className="loading-spinner" />
      <h3 style={{ marginTop: 20 }}>AI is evaluating {count} answers...</h3>
      <p className="form-subtitle">Scoring MCQs instantly · Analysing written answers with AI</p>
    </div>
  );

  const pct = Math.round((totalScore / (questions.length * 10)) * 100);
  return (
    <div>
      <div className="results-header">
        <h3>Assessment Results — {topic}</h3>
        <div className="results-score"><span className="score-big">{pct}%</span></div>
        <button className="btn btn-secondary btn-sm" onClick={() => generateAssessmentPDF(topic, results || [], totalScore, questions.length * 10)}><FiDownload /> Export PDF</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setStep('setup')}><FiRefreshCw /> New Assessment</button>
      </div>
      {(results || []).map((r, i) => (
        <div key={i} className="result-card card" style={{ marginBottom: 12, borderLeft: `3px solid ${r.isCorrect || (r.score >= 7) ? '#00B894' : r.score >= 4 ? '#FDCB6E' : '#e17055'}` }}>
          <h4>Q{i + 1}: {r.question}</h4>
          {r.type === 'mcq' ? (
            <div>
              <span className={`badge ${r.isCorrect ? 'badge-success' : 'badge-danger'}`}>{r.isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
              {!r.isCorrect && <p style={{ fontSize: 13, color: '#00B894', marginTop: 6 }}>Correct answer: {r.correct}</p>}
              {r.explanation && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{r.explanation}</p>}
            </div>
          ) : (
            <div>
              <p className="result-answer">Your answer: {r.userAnswer}</p>
              <span className="badge badge-primary">Score: {r.score}/{r.maxPoints}</span>
              {r.feedback && <p className="result-feedback">{r.feedback}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
