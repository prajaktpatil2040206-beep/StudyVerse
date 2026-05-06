import { useState, useEffect } from 'react';
import { database, ref, onValue, query, orderByChild, limitToLast } from '../services/firebase';
import './AchievementMarquee.css';

export default function AchievementMarquee() {
  const [achievements, setAchievements] = useState([
    { id: 1, message: 'Vivek completed a 50-day study streak' },
    { id: 2, message: 'Priya earned the Night Owl badge' },
    { id: 3, message: 'Rahul completed all daily tasks' },
    { id: 4, message: 'Ananya scored 95% on Java Assessment' },
    { id: 5, message: 'Karan earned the Hard Worker badge' },
    { id: 6, message: 'Sneha reached Level 10' },
    { id: 7, message: 'Arjun studied for 8 hours today' },
    { id: 8, message: 'Meera completed all weekly goals' },
  ]);

  useEffect(() => {
    const achRef = query(ref(database, 'achievements'), limitToLast(20));
    const unsub = onValue(achRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        if (items.length > 0) setAchievements(items);
      }
    });
    return () => unsub();
  }, []);

  const doubled = [...achievements, ...achievements];

  return (
    <div className="marquee-container">
      <div className="marquee-label">Live Achievements</div>
      <div className="marquee-track">
        <div className="marquee-content">
          {doubled.map((ach, i) => (
            <div key={`${ach.id}-${i}`} className="marquee-item">
              <span>{ach.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
