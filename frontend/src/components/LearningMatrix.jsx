import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { database, ref, get } from '../services/firebase';
import './LearningMatrix.css';
import { FiZap, FiAlertCircle, FiCalendar, FiUsers, FiTrash2 } from 'react-icons/fi';

const QUADRANTS = [
  { key: 'do_first', label: 'Do First', sub: 'Important & Urgent', color: '#e17055', bg: 'rgba(225,112,85,0.08)', Icon: FiAlertCircle },
  { key: 'schedule', label: 'Schedule', sub: 'Important, Not Urgent', color: '#6C63FF', bg: 'rgba(108,99,255,0.08)', Icon: FiCalendar },
  { key: 'delegate', label: 'Delegate', sub: 'Urgent, Not Important', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)', Icon: FiUsers },
  { key: 'eliminate', label: 'Eliminate', sub: 'Not Important, Not Urgent', color: '#b2bec3', bg: 'rgba(178,190,195,0.1)', Icon: FiTrash2 },
];

export default function LearningMatrix() {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState({ do_first: [], schedule: [], delegate: [], eliminate: [] });
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    loadMatrix();
  }, [user]);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      // Collect tasks from todos and timetable
      const [todoSnap, ttSnap] = await Promise.all([
        get(ref(database, `users/${user.uid}/todos/${today}`)),
        get(ref(database, `users/${user.uid}/timetable/daily/${today}`)),
      ]);
      const tasks = [];
      if (todoSnap.exists()) {
        Object.values(todoSnap.val()).filter(t => !t.completed).forEach(t => tasks.push(t.title));
      }
      if (ttSnap.exists() && ttSnap.val().slots) {
        ttSnap.val().slots.filter(s => s.type === 'study' || s.type === 'college')
          .forEach(s => tasks.push(`${s.subject} (${s.time})`));
      }
      if (tasks.length === 0) { setLoading(false); return; }
      const result = await api.taskMatrix({ tasks, userId: user.uid });
      setMatrix(result);
    } catch (e) {
      console.error('Matrix error:', e);
    }
    setLoading(false);
  };

  return (
    <div className="matrix-container">
      <div className="matrix-header">
        <h3><FiZap style={{ marginRight: '8px' }} />Learning Matrix</h3>
        <p>AI-classified tasks using the Eisenhower prioritization framework</p>
        <button className="btn btn-secondary btn-sm" onClick={loadMatrix} disabled={loading}>
          {loading ? 'Analyzing...' : '↻ Refresh'}
        </button>
      </div>

      <div className="matrix-axes">
        <div className="axis-label axis-y">← Not Important · IMPORTANCE · Important →</div>
        <div className="axis-label axis-x">↑ Not Urgent · URGENCY · Urgent ↓</div>
      </div>

      <div className="matrix-grid">
        {QUADRANTS.map(q => {
          const IconComponent = q.Icon;
          return (
            <div key={q.key} className="matrix-quadrant" style={{ background: q.bg, borderColor: q.color + '40' }}>
              <div className="mq-header" style={{ color: q.color }}>
                <span className="mq-icon"><IconComponent size={20} /></span>
                <div>
                  <div className="mq-label">{q.label}</div>
                  <div className="mq-sub">{q.sub}</div>
                </div>
              </div>
              <div className="mq-tasks">
                {loading ? (
                  <div className="mq-loading">Analyzing tasks...</div>
                ) : matrix[q.key]?.length > 0 ? (
                  matrix[q.key].map((task, i) => (
                    <div key={i} className="mq-task" style={{ borderLeftColor: q.color }}>
                      {task}
                    </div>
                  ))
                ) : (
                  <div className="mq-empty">No tasks here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="matrix-legend">
        <div className="legend-item"><span style={{ background: '#e17055' }} />Do immediately — high impact, time-sensitive</div>
        <div className="legend-item"><span style={{ background: '#6C63FF' }} />Plan for later — important for long-term goals</div>
        <div className="legend-item"><span style={{ background: '#FDCB6E' }} />Consider delegating or minimizing</div>
        <div className="legend-item"><span style={{ background: '#b2bec3' }} />Drop these — low value activities</div>
      </div>
    </div>
  );
}
