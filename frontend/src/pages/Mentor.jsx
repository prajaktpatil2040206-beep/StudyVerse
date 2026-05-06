import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, set as fbSet, push, get } from '../services/firebase';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { FiCalendar, FiTarget, FiMessageCircle, FiFileText, FiSend, FiMic, FiDownload, FiRefreshCw, FiCheck, FiUpload } from 'react-icons/fi';
import Footer from '../components/Footer';
import './Mentor.css';

const TABS = [
  { id: 'timetable', label: 'Timetable', icon: <FiCalendar />, emoji: '📅' },
  { id: 'goals', label: 'Goals', icon: <FiTarget />, emoji: '🎯' },
  { id: 'teacher', label: 'Teacher', icon: <FiMessageCircle />, emoji: '👨‍🏫' },
  { id: 'assessment', label: 'Assessment', icon: <FiFileText />, emoji: '📝' },
];

export default function Mentor() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('timetable');
  return (
    <div className="page">
      <div className="container">
        <motion.div className="page-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1>🤖 AI Mentor</h1>
          <p>Your personal AI-powered learning companion</p>
        </motion.div>
        <div className="mentor-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`mentor-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span className="tab-emoji">{tab.emoji}</span>{tab.label}
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

function TimetableGen({ user }) {
  const [form, setForm] = useState({});
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [approved, setApproved] = useState(false);
  const opts = { wakeUp: ['5 AM','6 AM','7 AM','8 AM','9 AM','10 AM'], peakStudy: ['Morning','Afternoon','Evening','Night'], freeTime: ['1-2 hrs','2-3 hrs','3-4 hrs','5+ hrs'], collegeTiming: ['8-12 PM','9-1 PM','10-2 PM','No College'], toughSubject: ['Math','Physics','Chemistry','Programming','DSA','Other'], sleepTime: ['10 PM','11 PM','12 AM','1 AM','2 AM'], events: ['None','Exam Tomorrow','Exam This Week','Match Weekend','Project Due'], subjects: ['3','4','5','6','7','8'] };
  const generate = async () => {
    setLoading(true);
    try { const res = await api.generateTimetable({ ...form, userId: user.uid }); setTimetable(res.timetable || res); }
    catch { setTimetable({ daily: [{ time:'6:00-7:00', subject:'Morning Routine', type:'routine' },{ time:'7:00-8:30', subject:form.toughSubject||'Deep Study', type:'study' },{ time:'8:30-9:00', subject:'Breakfast', type:'break' },{ time:'9:00-10:30', subject:'Study Block 2', type:'study' },{ time:'10:30-11:00', subject:'Break', type:'break' },{ time:'11:00-12:30', subject:'Study Block 3', type:'study' },{ time:'12:30-1:30', subject:'Lunch', type:'break' },{ time:'1:30-3:30', subject:'College', type:'college' },{ time:'3:30-5:00', subject:'Practice', type:'study' },{ time:'5:00-5:30', subject:'Break', type:'break' },{ time:'5:30-7:00', subject:'Revision', type:'study' },{ time:'7:00-8:00', subject:'Free Time', type:'break' },{ time:'8:00-9:30', subject:'Evening Study', type:'study' },{ time:'9:30-10:00', subject:'Wind Down', type:'routine' }] }); }
    setLoading(false);
  };
  const approve = async () => { const today = new Date().toISOString().split('T')[0]; if(timetable?.daily) await fbSet(ref(database,`users/${user.uid}/timetable/daily/${today}`),{slots:timetable.daily,statuses:{}}); setApproved(true); };
  const downloadPDF = () => { import('jspdf').then(({default:jsPDF})=>{ import('html2canvas').then(({default:html2canvas})=>{ const el=document.getElementById('tt-result'); if(!el)return; html2canvas(el).then(c=>{const pdf=new jsPDF('p','mm','a4');const w=pdf.internal.pageSize.getWidth();pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,w,(c.height*w)/c.width);pdf.save('timetable.pdf');}); }); }); };
  if(!timetable) return (
    <div className="card"><h3>📅 Generate Smart Timetable</h3><p className="form-subtitle">AI creates the perfect schedule based on your preferences</p>
      <div className="mentor-form-grid">{Object.entries(opts).map(([k,v])=>(<div className="input-group" key={k}><label>{k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</label><select className="input-field" value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}><option value="">Select...</option>{v.map(o=><option key={o} value={o}>{o}</option>)}</select></div>))}</div>
      <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading} style={{marginTop:20,width:'100%'}}>{loading?'Generating...':'✨ Generate Timetable'}</button></div>
  );
  return (<div id="tt-result"><div className="tt-result-header"><h3>📅 Your AI Timetable</h3><div className="tt-result-actions">{!approved?<button className="btn btn-success" onClick={approve}><FiCheck/> Approve</button>:<span className="badge badge-success">✅ Approved</span>}<button className="btn btn-secondary" onClick={downloadPDF}><FiDownload/> PDF</button></div></div>
    <table className="timetable-table" style={{width:'100%',background:'white',borderRadius:12}}><thead><tr><th>Time</th><th>Activity</th><th>Type</th></tr></thead><tbody>{(timetable.daily||[]).map((s,i)=>(<tr key={i}><td style={{fontWeight:600}}>{s.time}</td><td>{s.subject}</td><td><span className={`badge badge-${s.type==='study'?'primary':s.type==='college'?'warning':'success'}`}>{s.type}</span></td></tr>))}</tbody></table>
    {!approved&&<div className="rebuild-section"><textarea className="input-field" placeholder="What to change?" value={feedback} onChange={e=>setFeedback(e.target.value)} rows={2}/><button className="btn btn-secondary" onClick={()=>{setTimetable(null);setFeedback('');}}><FiRefreshCw/> Rebuild</button></div>}</div>);
}

function GoalSetting({ user }) {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [aiTip, setAiTip] = useState('');
  const [loading, setLoading] = useState(false);
  const addGoal = async () => {
    if(!newGoal.trim()) return; setLoading(true);
    let suggestion='Break this into daily tasks and track consistently.';
    try{ const r=await api.setGoal({goal:newGoal,userId:user.uid}); suggestion=r.suggestion||suggestion; }catch{}
    const goalRef=push(ref(database,`users/${user.uid}/goals`));
    const d={title:newGoal,suggestion,progress:0,createdAt:new Date().toISOString()};
    await fbSet(goalRef,d); setGoals(p=>[...p,{id:goalRef.key,...d}]); setAiTip(suggestion); setNewGoal(''); setLoading(false);
  };
  return (<motion.div initial={{opacity:0}} animate={{opacity:1}}>
    <div className="card" style={{marginBottom:24}}><h3>🎯 Set Goals</h3><div style={{display:'flex',gap:12,marginTop:16}}><input className="input-field" style={{flex:1}} placeholder="e.g., Study 10 hrs daily..." value={newGoal} onChange={e=>setNewGoal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addGoal()}/><button className="btn btn-primary" onClick={addGoal} disabled={loading}>{loading?'...':'✨ AI Plan'}</button></div>
    {aiTip&&<div className="ai-suggestion-box"><strong>🤖 AI:</strong> {aiTip}</div>}</div>
    <div className="goals-list">{goals.map(g=>(<div key={g.id} className="goal-card card"><h4>{g.title}</h4>{g.suggestion&&<p className="goal-suggestion">💡 {g.suggestion}</p>}<div className="goal-progress-bar"><div className="goal-progress-fill" style={{width:`${g.progress||0}%`}}/></div></div>))}{goals.length===0&&<div className="todo-empty"><span className="todo-empty-emoji">🎯</span><p>No goals yet!</p></div>}</div>
  </motion.div>);
}

function TeacherChat({ user }) {
  const [msgs, setMsgs] = useState([{role:'assistant',content:`Hello ${user?.name?.split(' ')[0]||'there'}! 👋 I'm your AI teacher. Ask me anything!`}]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const distress = ['suicide','kill myself','want to die','end my life','self harm'];
  const send = async () => {
    if(!input.trim()) return;
    setMsgs(p=>[...p,{role:'user',content:input}]); const msg=input; setInput(''); setLoading(true);
    if(distress.some(k=>msg.toLowerCase().includes(k))) { setMsgs(p=>[...p,{role:'assistant',content:"I'm concerned about you. 💙\n\n🆘 Helplines:\n- iCall: 9152987821\n- Vandrevala: 1860-2662-345\n- AASRA: 9820466726\n\nYou matter. Please talk to someone. 🤗"}]); setLoading(false); return; }
    try { const r=await api.chat({message:msg,history:msgs.slice(-10),userId:user.uid}); setMsgs(p=>[...p,{role:'assistant',content:r.response||r.message||'Let me think...'}]); }
    catch { setMsgs(p=>[...p,{role:'assistant',content:"Backend not connected. Please start the server."}]); }
    setLoading(false);
  };
  const toggleVoice = () => {
    if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){alert('Use Chrome for voice');return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const r=new SR(); r.lang='en-US'; r.onresult=e=>{setInput(p=>p+e.results[0][0].transcript);setListening(false);}; r.onerror=()=>setListening(false); r.onend=()=>setListening(false); r.start(); setListening(true);
  };
  return (<div className="chat-container">
    <div className="chat-messages">{msgs.map((m,i)=>(<div key={i} className={`chat-msg ${m.role}`}><div className="chat-avatar">{m.role==='assistant'?'🤖':'👤'}</div><div className="chat-bubble"><pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0}}>{m.content}</pre></div></div>))}{loading&&<div className="chat-msg assistant"><div className="chat-avatar">🤖</div><div className="chat-bubble typing"><span/><span/><span/></div></div>}</div>
    <div className="chat-input-bar"><button className={`chat-voice-btn ${listening?'active':''}`} onClick={toggleVoice}><FiMic/></button><input className="chat-input" placeholder="Ask anything..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/><button className="chat-send-btn" onClick={send} disabled={loading||!input.trim()}><FiSend/></button></div>
  </div>);
}

function Assessment({ user }) {
  const [step, setStep] = useState('upload');
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const gen = async () => {
    setLoading(true);
    try { const r=await api.generateQuestions({topic,userId:user.uid}); setQuestions(r.questions||[{question:`Explain ${topic}`,points:10},{question:`Advantages of ${topic}?`,points:10},{question:`Example of ${topic}`,points:10},{question:`Common mistakes in ${topic}?`,points:10},{question:`Explain ${topic} to a beginner`,points:10}]); }
    catch { setQuestions([{question:`Explain ${topic}`,points:10},{question:`Key components of ${topic}?`,points:10},{question:`Practical example of ${topic}`,points:10},{question:`Challenges in ${topic}?`,points:10},{question:`How ${topic} relates to other areas?`,points:10}]); }
    setStep('quiz'); setLoading(false);
  };
  const submit = async () => {
    const q=questions[currentQ]; setLoading(true);
    let fb={score:7,feedback:'Good answer!'};
    try{ const r=await api.evaluateAnswer({question:q.question,answer:answers[currentQ]||'',userId:user.uid}); fb=r; }catch{}
    setResults(p=>[...p,{question:q.question,answer:answers[currentQ],...fb}]); setTotalScore(p=>p+(fb.score||0));
    if(currentQ<questions.length-1) setCurrentQ(c=>c+1); else setStep('results');
    setLoading(false);
  };
  const dlPDF = () => { import('jspdf').then(({default:jsPDF})=>{const p=new jsPDF();p.setFontSize(18);p.text('Assessment Results',20,20);p.setFontSize(12);p.text(`Topic: ${topic} | Score: ${totalScore}/${questions.length*10}`,20,32);let y=45;results.forEach((r,i)=>{if(y>260){p.addPage();y=20;}p.setFontSize(11);p.text(`Q${i+1}: ${r.question}`,20,y);y+=7;p.setFontSize(10);p.text(`A: ${(r.answer||'').slice(0,80)}`,25,y);y+=7;p.text(`Score: ${r.score}/10`,25,y);y+=12;});p.save('assessment.pdf');}); };
  if(step==='upload') return (<div className="card"><h3>📝 AI Assessment</h3><p className="form-subtitle">Enter a topic and AI will quiz you</p><div className="input-group" style={{marginTop:16}}><label>Topic</label><input className="input-field" placeholder="e.g., Java OOP, React Hooks..." value={topic} onChange={e=>setTopic(e.target.value)}/></div><button className="btn btn-primary btn-lg" style={{marginTop:20,width:'100%'}} onClick={gen} disabled={loading||!topic.trim()}>{loading?'...':'🧠 Start Assessment'}</button></div>);
  if(step==='quiz') return (<div><div className="quiz-header"><span>Q {currentQ+1}/{questions.length}</span><div className="quiz-progress"><div style={{width:`${((currentQ+1)/questions.length)*100}%`}}/></div></div><div className="card quiz-card"><h3>{questions[currentQ]?.question}</h3><textarea className="input-field" rows={4} placeholder="Your answer..." value={answers[currentQ]||''} onChange={e=>setAnswers(a=>({...a,[currentQ]:e.target.value}))}/></div><button className="btn btn-primary btn-lg" style={{marginTop:16,width:'100%'}} onClick={submit} disabled={loading||!answers[currentQ]?.trim()}>{loading?'Evaluating...':currentQ<questions.length-1?'Submit & Next →':'Finish ✨'}</button></div>);
  return (<div><div className="results-header"><h3>📊 Results</h3><div className="results-score"><span className="score-big">{totalScore}</span>/{questions.length*10}</div><button className="btn btn-secondary" onClick={dlPDF}><FiDownload/> PDF</button></div>{results.map((r,i)=>(<div key={i} className="result-card card" style={{marginBottom:12}}><h4>Q{i+1}: {r.question}</h4><p className="result-answer">Your answer: {r.answer}</p><div className="result-meta"><span className="badge badge-primary">Score: {r.score}/10</span><p className="result-feedback">💡 {r.feedback}</p></div></div>))}</div>);
}
