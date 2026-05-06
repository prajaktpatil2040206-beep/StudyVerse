import { useState, useEffect } from 'react';
import { database, ref, onValue, update } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { FiCheck, FiX, FiClock } from 'react-icons/fi';
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

export default function Timetable({ slots: propSlots }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState(propSlots || defaultSlots);
  const [statuses, setStatuses] = useState({});
  const today = new Date().toISOString().split('T')[0];

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

  const markStatus = async (index, status) => {
    const newStatuses = { ...statuses, [index]: status };
    setStatuses(newStatuses);
    await update(ref(database, `users/${user.uid}/timetable/daily/${today}`), { statuses: newStatuses });
  };

  const now = new Date();
  const currentHour = now.getHours();

  const getRowClass = (slot, index) => {
    const startHour = parseInt(slot.time.split(':')[0]);
    if (statuses[index] === 'done') return 'status-done';
    if (statuses[index] === 'skipped') return 'status-skipped';
    if (startHour === currentHour) return 'status-current';
    if (startHour < currentHour && !statuses[index]) return 'status-missed';
    return '';
  };

  const doneCount = Object.values(statuses).filter(s => s === 'done').length;
  const wastedCount = Object.values(statuses).filter(s => s === 'skipped').length;

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h3>Today's Timetable</h3>
        <div className="timetable-stats">
          <span className="tt-stat done"><FiCheck size={11} /> {doneCount} done</span>
          <span className="tt-stat wasted"><FiX size={11} /> {wastedCount} skipped</span>
        </div>
      </div>
      <div className="timetable-table-wrap">
        <table className="timetable-table">
          <thead>
            <tr><th>Time</th><th>Activity</th><th>Type</th><th>Status</th></tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => (
              <tr key={i} className={getRowClass(slot, i)}>
                <td className="tt-time"><FiClock size={11} /> {slot.time}</td>
                <td className="tt-subject">{slot.subject}</td>
                <td><span className={`badge badge-${slot.type === 'study' ? 'primary' : slot.type === 'college' ? 'warning' : 'success'}`}>{slot.type}</span></td>
                <td className="tt-actions">
                  {slot.type !== 'routine' && slot.type !== 'break' ? (
                    <>
                      <button className={`tt-btn done ${statuses[i] === 'done' ? 'active' : ''}`} onClick={() => markStatus(i, 'done')} title="Mark done"><FiCheck size={12} /></button>
                      <button className={`tt-btn skip ${statuses[i] === 'skipped' ? 'active' : ''}`} onClick={() => markStatus(i, 'skipped')} title="Mark skipped"><FiX size={12} /></button>
                    </>
                  ) : <span className="tt-auto">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
