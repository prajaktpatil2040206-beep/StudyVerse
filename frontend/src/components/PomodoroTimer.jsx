import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, push, set as fbSet, get, update } from '../services/firebase';
import { api } from '../services/api';
import { FiPlay, FiPause, FiSkipForward, FiRefreshCw, FiCoffee, FiZap } from 'react-icons/fi';
import './PomodoroTimer.css';

const PHASES = [
  { label: 'Focus', duration: 25 * 60, color: '#6C63FF' },
  { label: 'Short Break', duration: 5 * 60, color: '#00B894' },
  { label: 'Focus', duration: 25 * 60, color: '#6C63FF' },
  { label: 'Short Break', duration: 5 * 60, color: '#00B894' },
  { label: 'Focus', duration: 25 * 60, color: '#6C63FF' },
  { label: 'Short Break', duration: 5 * 60, color: '#00B894' },
  { label: 'Focus', duration: 25 * 60, color: '#6C63FF' },
  { label: 'Long Break', duration: 15 * 60, color: '#FDCB6E' },
];

export default function PomodoroTimer({ userSubjects = [] }) {
  const { user } = useAuth();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PHASES[0].duration);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalMinsToday, setTotalMinsToday] = useState(0);
  const [subject, setSubject] = useState('General');
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    get(ref(database, `users/${user.uid}/productivity/sessions/${today}`)).then(snap => {
      if (snap.exists()) {
        const sessions = Object.values(snap.val());
        const focusSessions = sessions.filter(s => s.sessionType === 'pomodoro' && s.completed);
        setSessionsToday(focusSessions.length);
        setTotalMinsToday(focusSessions.reduce((s, x) => s + (x.durationMins || 25), 0));
      }
    });
  }, [user, today]);

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(intervalRef.current);
        setRunning(false);
        handlePhaseComplete();
        return 0;
      }
      return prev - 1;
    });
  }, [phaseIdx]);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  const handlePhaseComplete = async () => {
    const phase = PHASES[phaseIdx];
    if (phase.label.includes('Focus') && user?.uid) {
      const durationMins = Math.round(phase.duration / 60);
      const sessionRef = push(ref(database, `users/${user.uid}/productivity/sessions/${today}`));
      await fbSet(sessionRef, {
        subject, sessionType: 'pomodoro', durationMins,
        completed: true, startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date().toISOString(),
      });
      
      // Update activity study hours - USE UPDATE NOT SET to preserve other fields
      const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
      const act = actSnap.exists() ? actSnap.val() : {};
      const hrs = (act.studyHours || 0) + durationMins / 60;
      const poms = (act.pomodoroSessions || 0) + 1;
      await update(ref(database, `users/${user.uid}/activity/${today}`), {
        studyHours: Math.round(hrs * 10) / 10, 
        pomodoroSessions: poms,
      });
      
      // XP: 10 XP per completed pomodoro
      const gamSnap = await get(ref(database, `users/${user.uid}/gamification`));
      const gam = gamSnap.exists() ? gamSnap.val() : { xp: 0, level: 1 };
      const newXp = (gam.xp || 0) + 10;
      const newLevel = Math.floor(newXp / 200) + 1;
      await update(ref(database, `users/${user.uid}/gamification`), { 
        xp: newXp, 
        level: newLevel 
      });
      
      // Update leaderboard
      await update(ref(database, `leaderboard/${user.uid}`), { 
        name: user.name, 
        xp: newXp, 
        streak: gam.streak || 0, 
        level: newLevel 
      });
      
      setSessionsToday(s => s + 1);
      setTotalMinsToday(m => m + durationMins);
      
      console.log(`✅ Pomodoro completed: +${durationMins/60}h study time, +10 XP`);
    }
    // Advance phase
    const next = (phaseIdx + 1) % PHASES.length;
    setPhaseIdx(next);
    setTimeLeft(PHASES[next].duration);
  };

  const skip = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    const next = (phaseIdx + 1) % PHASES.length;
    setPhaseIdx(next);
    setTimeLeft(PHASES[next].duration);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(PHASES[phaseIdx].duration);
  };

  const phase = PHASES[phaseIdx];
  const progress = 1 - timeLeft / phase.duration;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="pomodoro-card card">
      <div className="pomodoro-header">
        <h3><FiZap /> Pomodoro Focus Timer</h3>
        <div className="pomodoro-stats">
          <span><FiCoffee /> {sessionsToday} sessions</span>
          <span>⏱ {totalMinsToday} min today</span>
        </div>
      </div>

      <div className="pomodoro-phases">
        {['Focus', 'Short Break', 'Long Break'].map(p => (
          <span key={p} className={`phase-pill ${phase.label === p || (p === 'Focus' && phase.label === 'Focus') ? 'active' : ''}`}
            style={{ '--phase-color': p === 'Focus' ? '#6C63FF' : p === 'Short Break' ? '#00B894' : '#FDCB6E' }}>
            {p}
          </span>
        ))}
      </div>

      <div className="pomodoro-ring-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle cx="90" cy="90" r={radius} fill="none" stroke={phase.color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="pomodoro-time-overlay">
          <div className="pomodoro-countdown">{mins}:{secs}</div>
          <div className="pomodoro-phase-label" style={{ color: phase.color }}>{phase.label}</div>
        </div>
      </div>

      <div className="pomodoro-subject-row">
        <label>Subject:</label>
        <select value={subject} onChange={e => setSubject(e.target.value)} className="input-field" style={{ flex: 1, fontSize: 13 }}>
          <option value="General">General</option>
          {userSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="pomodoro-controls">
        <button className="pom-btn secondary" onClick={reset} title="Reset"><FiRefreshCw /></button>
        <button className="pom-btn primary" onClick={() => setRunning(r => !r)} style={{ background: phase.color }}>
          {running ? <FiPause size={22} /> : <FiPlay size={22} />}
        </button>
        <button className="pom-btn secondary" onClick={skip} title="Skip"><FiSkipForward /></button>
      </div>

      <div className="pomodoro-cycle">
        {PHASES.map((p, i) => (
          <div key={i} className={`cycle-dot ${i < phaseIdx ? 'done' : i === phaseIdx ? 'current' : ''}`}
            style={{ background: i === phaseIdx ? p.color : '' }} />
        ))}
      </div>
    </div>
  );
}
