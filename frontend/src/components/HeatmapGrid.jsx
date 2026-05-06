import './HeatmapGrid.css';

export default function HeatmapGrid({ activityData = {} }) {
  const today = new Date();
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const val = activityData[key] || {};
    const intensity = (val.studyHours || 0) + (val.tasksCompleted || 0) * 0.5 + (val.questionsAnswered || 0) * 0.3;
    days.push({ date: key, intensity, ...val });
  }

  const getColor = (intensity) => {
    if (intensity === 0) return '#CDD4E0';
    if (intensity < 2) return '#A8C4E8';
    if (intensity < 4) return '#7BA7D8';
    if (intensity < 6) return '#5282C4';
    return '#6C63FF';
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekDays = ['Mon','','Wed','','Fri','',''];

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h3>Study Consistency</h3>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0, 1, 3, 5, 7].map(v => <div key={v} className="heatmap-legend-cell" style={{ background: getColor(v) }} />)}
          <span>More</span>
        </div>
      </div>
      <div className="heatmap-wrapper">
        <div className="heatmap-days">
          {weekDays.map((d, i) => <div key={i} className="heatmap-day-label">{d}</div>)}
        </div>
        <div className="heatmap-grid-scroll">
          <div className="heatmap-months">
            {months.map(m => <div key={m} className="heatmap-month">{m}</div>)}
          </div>
          <div className="heatmap-grid">
            {days.map((day, i) => (
              <div key={i} className="heatmap-cell" style={{ background: getColor(day.intensity) }}
                title={`${day.date} — Study: ${day.studyHours || 0}h, Tasks: ${day.tasksCompleted || 0}, Questions: ${day.questionsAnswered || 0}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
