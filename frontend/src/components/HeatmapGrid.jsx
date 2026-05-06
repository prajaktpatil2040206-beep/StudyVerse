import { useState } from 'react';
import './HeatmapGrid.css';

export default function HeatmapGrid({ activityData = {} }) {
  const [timeRange, setTimeRange] = useState('year'); // day, week, month, year
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Calculate number of days based on time range
  const getDaysCount = () => {
    switch(timeRange) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 365;
    }
  };
  
  const daysCount = getDaysCount();
  
  // Generate days array
  const days = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const val = activityData[key] || {};
    const intensity = (val.studyHours || 0) + (val.tasksCompleted || 0) * 0.5 + (val.questionsAnswered || 0) * 0.3;
    days.push({ 
      date: key, 
      intensity, 
      ...val, 
      dateObj: d,
      isToday: key === todayStr 
    });
  }

  const getColor = (intensity, isToday) => {
    if (isToday) return '#6C63FF'; // Highlight today with accent color
    if (intensity === 0) return '#CDD4E0';
    if (intensity < 2) return '#A8C4E8';
    if (intensity < 4) return '#7BA7D8';
    if (intensity < 6) return '#5282C4';
    return '#6C63FF';
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekDays = ['Mon','','Wed','','Fri','',''];

  // Calculate month labels for year view based on actual dates
  const getMonthLabels = () => {
    const labels = [];
    let currentMonth = -1;
    
    // Group days into weeks (7 days each)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    // Find which week each month starts in
    weeks.forEach((week, weekIndex) => {
      week.forEach(day => {
        const month = day.dateObj.getMonth();
        if (month !== currentMonth) {
          currentMonth = month;
          labels.push({ 
            month: months[month], 
            weekIndex: weekIndex,
            gridColumn: weekIndex + 1 // 1-indexed for CSS grid
          });
        }
      });
    });
    
    return labels;
  };

  const monthLabels = timeRange === 'year' ? getMonthLabels() : [];

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h3>Study Consistency</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="heatmap-legend">
            <span>Less</span>
            {[0, 1, 3, 5, 7].map(v => <div key={v} className="heatmap-legend-cell" style={{ background: getColor(v, false) }} />)}
            <span>More</span>
          </div>
          <div className="heatmap-time-filter">
            <button className={timeRange === 'day' ? 'active' : ''} onClick={() => setTimeRange('day')}>Day</button>
            <button className={timeRange === 'week' ? 'active' : ''} onClick={() => setTimeRange('week')}>Week</button>
            <button className={timeRange === 'month' ? 'active' : ''} onClick={() => setTimeRange('month')}>Month</button>
            <button className={timeRange === 'year' ? 'active' : ''} onClick={() => setTimeRange('year')}>Year</button>
          </div>
        </div>
      </div>
      
      {timeRange === 'year' ? (
        <div className="heatmap-wrapper">
          <div className="heatmap-days">
            {weekDays.map((d, i) => <div key={i} className="heatmap-day-label">{d}</div>)}
          </div>
          <div className="heatmap-grid-scroll">
            <div className="heatmap-months-dynamic">
              {monthLabels.map((ml, i) => (
                <div 
                  key={i} 
                  className="heatmap-month-label" 
                  style={{ 
                    gridColumn: `${ml.gridColumn} / span 4`,
                    left: `${ml.weekIndex * 14}px` 
                  }}>
                  {ml.month}
                </div>
              ))}
            </div>
            <div className="heatmap-grid">
              {days.map((day, i) => (
                <div 
                  key={i} 
                  className={`heatmap-cell ${day.isToday ? 'today' : ''}`}
                  style={{ background: getColor(day.intensity, day.isToday) }}
                  title={`${day.date}${day.isToday ? ' (Today)' : ''} — Study: ${day.studyHours || 0}h, Tasks: ${day.tasksCompleted || 0}, Questions: ${day.questionsAnswered || 0}`} 
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="heatmap-simple-view">
          {days.map((day, i) => (
            <div 
              key={i} 
              className={`heatmap-simple-cell ${day.isToday ? 'today' : ''}`}
              style={{ background: getColor(day.intensity, day.isToday) }}
              title={`${day.date}${day.isToday ? ' (Today)' : ''} — Study: ${day.studyHours || 0}h, Tasks: ${day.tasksCompleted || 0}, Questions: ${day.questionsAnswered || 0}`}>
              <span className="heatmap-simple-date">{day.dateObj.getDate()}</span>
              <span className="heatmap-simple-day">{day.dateObj.toLocaleDateString('en', { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
