import { useState } from 'react';
import './ConsistencyHeatmap.css';

const VIEWS = ['Day', 'Week', 'Month', 'Year'];

function getColor(intensity, max = 8) {
  if (intensity === 0) return 'var(--border)';
  const pct = Math.min(intensity / max, 1);
  if (pct < 0.25) return '#A8C4E8';
  if (pct < 0.5) return '#7BA7D8';
  if (pct < 0.75) return '#5282C4';
  return '#6C63FF';
}

function computeIntensity(act) {
  if (!act) return 0;
  return (act.studyHours || 0) + (act.tasksCompleted || 0) * 0.5 + (act.questionsAnswered || 0) * 0.2 + (act.pomodoroSessions || 0) * 0.3;
}

export default function ConsistencyHeatmap({ activityData = {} }) {
  const [view, setView] = useState('Year');
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  // --- YEAR VIEW (365 grid) ---
  const renderYear = () => {
    const days = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const act = activityData[key] || {};
      const intensity = computeIntensity(act);
      days.push({ key, intensity, act, d });
    }
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const weekDays = ['Mon','','Wed','','Fri','',''];
    return (
      <div className="heatmap-year">
        <div className="heatmap-wrapper">
          <div className="heatmap-days">{weekDays.map((d,i) => <div key={i} className="hm-day-lbl">{d}</div>)}</div>
          <div className="heatmap-grid-scroll">
            <div className="heatmap-months">{months.map(m => <div key={m} className="hm-month">{m}</div>)}</div>
            <div className="heatmap-grid year-grid">
              {days.map((day) => (
                <div key={day.key} className="hm-cell" style={{ background: getColor(day.intensity) }}
                  title={`${day.key} — Study: ${day.act.studyHours||0}h, Tasks: ${day.act.tasksCompleted||0}, Pomodoros: ${day.act.pomodoroSessions||0}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- MONTH VIEW (30-day calendar) ---
  const renderMonth = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const act = activityData[key] || {};
      days.push({ key, intensity: computeIntensity(act), act, date: d.getDate(), day: d.toLocaleDateString('en', { weekday: 'short' }) });
    }
    return (
      <div className="heatmap-month-grid">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="month-day-header">{d}</div>
        ))}
        {/* Fill leading empty cells */}
        {Array.from({ length: new Date(days[0].key).getDay() }, (_, i) => (
          <div key={`empty-${i}`} className="month-cell empty" />
        ))}
        {days.map(day => (
          <div key={day.key} className={`month-cell ${day.key === todayKey ? 'today' : ''}`}
            style={{ background: getColor(day.intensity) }}
            title={`${day.key}: ${day.act.studyHours||0}h study, ${day.act.tasksCompleted||0} tasks`}>
            <span className="month-date-num">{day.date}</span>
            {day.intensity > 0 && <span className="month-dot" />}
          </div>
        ))}
      </div>
    );
  };

  // --- WEEK VIEW (7 days) ---
  const renderWeek = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const act = activityData[key] || {};
      days.push({ key, act, label: d.toLocaleDateString('en', { weekday: 'short' }), date: d.getDate(), intensity: computeIntensity(act) });
    }
    return (
      <div className="heatmap-week">
        {days.map(day => (
          <div key={day.key} className={`week-col ${day.key === todayKey ? 'today' : ''}`}>
            <div className="week-bar-wrap">
              <div className="week-bar" style={{ height: `${Math.min(100, day.intensity * 12)}%`, background: getColor(day.intensity) }} />
            </div>
            <div className="week-label">{day.label}</div>
            <div className="week-date">{day.date}</div>
            <div className="week-stats">
              <span title="Study hours">📚 {(day.act.studyHours||0).toFixed(1)}h</span>
              <span title="Tasks">✅ {day.act.tasksCompleted||0}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- DAY VIEW (hourly blocks for today) ---
  const renderDay = () => {
    const todayAct = activityData[todayKey] || {};
    const sessions = todayAct.sessions || {};
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h-12}PM`,
      active: sessions[h] || 0,
    }));
    return (
      <div className="heatmap-day">
        <div className="day-grid">
          {hours.map(h => (
            <div key={h.hour} className="day-hour-block" style={{ background: h.active > 0 ? '#6C63FF' : 'var(--border)', opacity: h.active > 0 ? 0.8 + h.active * 0.1 : 0.4 }}
              title={`${h.label}: ${h.active > 0 ? 'Study activity recorded' : 'No activity'}`}>
            </div>
          ))}
        </div>
        <div className="day-hour-labels">
          {[0,6,12,18,23].map(h => (
            <span key={h}>{h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h-12}PM`}</span>
          ))}
        </div>
        <div className="day-summary">
          <div className="day-stat"><span>📚</span><strong>{(todayAct.studyHours||0).toFixed(1)}h</strong><small>Study</small></div>
          <div className="day-stat"><span>🍅</span><strong>{todayAct.pomodoroSessions||0}</strong><small>Pomodoros</small></div>
          <div className="day-stat"><span>✅</span><strong>{todayAct.tasksCompleted||0}</strong><small>Tasks</small></div>
          <div className="day-stat"><span>📝</span><strong>{todayAct.questionsAnswered||0}</strong><small>Questions</small></div>
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (view) {
      case 'Day': return renderDay();
      case 'Week': return renderWeek();
      case 'Month': return renderMonth();
      default: return renderYear();
    }
  };

  return (
    <div className="consistency-heatmap card">
      <div className="hm-top">
        <h3>Study Consistency</h3>
        <div className="hm-view-tabs">
          {VIEWS.map(v => (
            <button key={v} className={`hm-view-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
      </div>
      <div className="hm-legend">
        <span>Less</span>
        {[0, 1, 3, 5, 7].map(v => <div key={v} className="hm-legend-cell" style={{ background: getColor(v) }} />)}
        <span>More</span>
      </div>
      {renderView()}
    </div>
  );
}
