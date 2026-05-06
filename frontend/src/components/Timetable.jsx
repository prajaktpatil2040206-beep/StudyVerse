import { useState, useEffect } from 'react';
import { database, ref, onValue, update, get } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { generateDailyTimetablePDF } from '../utils/pdfGenerator';
import { FiCheck, FiX, FiClock, FiDownload, FiLock } from 'react-icons/fi';
import './Timetable.css';

const defaultSlots = [
  { time: '06:00 - 07:00', subject: 'Morning Routine', type: 'routine' },
  { time: '07:00 - 08:00', subject: 'Exercise', type: 'health' },
  { time: '08:00 - 09:00', subject: 'Breakfast & Prep', type: 'routine' },
  { time: '09:00 - 10:30', subject: 'Study Block 1', type: 'study' },
  { time: '10:30 - 11:00', subject: 'Break', type: 'break' },
  { time: '11:00 - 12:30', subject: 'Study Block 2', type: 'study' },
  { time: '12:30 - 13:30', subject: 'Lunch', type: 'routine' },
  { time: '13:30 - 15:00', subject: 'College / Class', type: 'college' },
  { time: '15:00 - 16:30', subject: 'Study Block 3', type: 'study' },
  { time: '16:30 - 17:00', subject: 'Break', type: 'break' },
  { time: '17:00 - 18:30', subject: 'Study Block 4', type: 'study' },
  { time: '18:30 - 19:30', subject: 'Free Time', type: 'break' },
  { time: '19:30 - 20:00', subject: 'Dinner', type: 'routine' },
  { time: '20:00 - 21:30', subject: 'Revision', type: 'study' },
  { time: '21:30 - 22:00', subject: 'Wind Down', type: 'routine' },
];

// Parse "HH:MM - HH:MM" → end minutes from midnight
function parseSlotEnd(timeStr) {
  try {
    const end = timeStr.split('-')[1]?.trim();
    if (!end) return Infinity;
    const [h, m] = end.split(':').map(Number);
    return h * 60 + m;
  } catch { return Infinity; }
}

function parseSlotStart(timeStr) {
  try {
    const start = timeStr.split('-')[0]?.trim();
    const [h, m] = start.split(':').map(Number);
    return h * 60 + m;
  } catch { return 0; }
}

export default function Timetable({ slots: propSlots }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState(propSlots || defaultSlots);
  const [statuses, setStatuses] = useState({});
  const [now, setNow] = useState(new Date());
  const today = new Date().toISOString().split('T')[0];

  // Update clock every minute to detect expiry
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const statusRef = ref(database, `users/${user.uid}/timetable/daily/${today}`);
    const unsub = onValue(statusRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (data.slots) setSlots(data.slots);
        if (data.statuses) setStatuses(data.statuses);
      }
    });
    return () => unsub();
  }, [user, today]);

  // Auto-expire: detect slots whose time has passed and aren't marked
  useEffect(() => {
    if (!user?.uid) return;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let changed = false;
    const updated = { ...statuses };
    slots.forEach((slot, i) => {
      const actionable = slot.type !== 'routine' && slot.type !== 'break';
      if (actionable && !statuses[i] && parseSlotEnd(slot.time) < nowMins) {
        updated[i] = 'expired';
        changed = true;
      }
    });
    if (changed) {
      setStatuses(updated);
      update(ref(database, `users/${user.uid}/timetable/daily/${today}`), { statuses: updated });
      // XP penalty per expired slot
      const expiredCount = Object.values(updated).filter(s => s === 'expired').length - Object.values(statuses).filter(s => s === 'expired').length;
      if (expiredCount > 0) {
        get(ref(database, `users/${user.uid}/gamification`)).then(snap => {
          const gam = snap.exists() ? snap.val() : { xp: 0 };
          const newXp = Math.max(0, (gam.xp || 0) - expiredCount * 5);
          update(ref(database, `users/${user.uid}/gamification`), { xp: newXp });
        });
      }
    }
  }, [now, slots, user, today]);

  const markStatus = async (index, status) => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    if (parseSlotEnd(slots[index]?.time) < nowMins) return; // expired, block
    const newStatuses = { ...statuses, [index]: status };
    setStatuses(newStatuses);
    await update(ref(database, `users/${user.uid}/timetable/daily/${today}`), { statuses: newStatuses });
    // Log completed study slots to activity
    if (status === 'done' && (slots[index]?.type === 'study' || slots[index]?.type === 'college')) {
      const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
      const act = actSnap.exists() ? actSnap.val() : {};
      await update(ref(database, `users/${user.uid}/activity/${today}`), {
        ...act, tasksCompleted: (act.tasksCompleted || 0) + 1,
      });
    }
  };

  const nowMins = now.getHours() * 60 + now.getMinutes();

  const getRowClass = (slot, index) => {
    if (statuses[index] === 'done') return 'status-done';
    if (statuses[index] === 'skipped') return 'status-skipped';
    if (statuses[index] === 'expired') return 'status-expired';
    const startMins = parseSlotStart(slot.time);
    const endMins = parseSlotEnd(slot.time);
    if (startMins <= nowMins && endMins > nowMins) return 'status-current';
    if (endMins < nowMins) return 'status-missed';
    return '';
  };

  const isSlotExpired = (slot, index) => {
    return statuses[index] === 'expired' || parseSlotEnd(slot.time) < nowMins;
  };

  const doneCount = Object.values(statuses).filter(s => s === 'done').length;
  const expiredCount = Object.values(statuses).filter(s => s === 'expired').length;

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h3>Today's Timetable</h3>
        <div className="timetable-stats">
          <span className="tt-stat done"><FiCheck size={11} /> {doneCount} done</span>
          {expiredCount > 0 && <span className="tt-stat expired"><FiLock size={11} /> {expiredCount} expired</span>}
          <button className="btn btn-secondary btn-sm" onClick={() => generateDailyTimetablePDF(slots, statuses)} title="PDF">
            <FiDownload size={13} /> PDF
          </button>
        </div>
      </div>
      <div className="timetable-table-wrap">
        <table className="timetable-table">
          <thead>
            <tr><th>Time</th><th>Activity</th><th>Type</th><th>Status</th></tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => {
              const expired = isSlotExpired(slot, i);
              const actionable = slot.type !== 'routine' && slot.type !== 'break';
              return (
                <tr key={i} className={getRowClass(slot, i)}>
                  <td className="tt-time"><FiClock size={11} /> {slot.time}</td>
                  <td className="tt-subject">
                    {slot.subject}
                    {expired && actionable && statuses[i] !== 'done' && (
                      <span className="expired-badge"><FiLock size={10} /> Expired</span>
                    )}
                  </td>
                  <td><span className={`badge badge-${slot.type === 'study' ? 'primary' : slot.type === 'college' ? 'warning' : 'success'}`}>{slot.type}</span></td>
                  <td className="tt-actions">
                    {actionable ? (
                      expired && statuses[i] !== 'done' ? (
                        <span className="tt-expired-label"><FiLock size={11} /> Locked</span>
                      ) : (
                        <>
                          <button className={`tt-btn done ${statuses[i] === 'done' ? 'active' : ''}`}
                            onClick={() => markStatus(i, 'done')} disabled={!!statuses[i]} title="Mark done">
                            <FiCheck size={12} />
                          </button>
                          <button className={`tt-btn skip ${statuses[i] === 'skipped' ? 'active' : ''}`}
                            onClick={() => markStatus(i, 'skipped')} disabled={!!statuses[i]} title="Mark skipped">
                            <FiX size={12} />
                          </button>
                        </>
                      )
                    ) : <span className="tt-auto">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
