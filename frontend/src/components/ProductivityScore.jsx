import './ProductivityScore.css';
import { FiCheckCircle, FiClock, FiBook, FiZap, FiHeart, FiTarget } from 'react-icons/fi';

const WEIGHTS = [
  { key: 'taskCompletion', label: 'Task Completion', weight: 25, color: '#6C63FF', Icon: FiCheckCircle },
  { key: 'focusQuality', label: 'Focus Quality', weight: 20, color: '#00B894', Icon: FiClock },
  { key: 'learningOutcomes', label: 'Learning Outcomes', weight: 20, color: '#0984E3', Icon: FiBook },
  { key: 'consistency', label: 'Consistency', weight: 15, color: '#FDCB6E', Icon: FiZap },
  { key: 'wellness', label: 'Wellness', weight: 10, color: '#e84393', Icon: FiHeart },
  { key: 'goalAchievement', label: 'Goal Achievement', weight: 10, color: '#E17055', Icon: FiTarget },
];

export default function ProductivityScore({ scoreData = null }) {
  const breakdown = scoreData?.breakdown || {};
  const total = scoreData?.total || 0;

  const getGrade = (score) => {
    if (score >= 85) return { grade: 'A+', color: '#00B894', label: 'Excellent' };
    if (score >= 70) return { grade: 'A', color: '#6C63FF', label: 'Great' };
    if (score >= 55) return { grade: 'B', color: '#0984E3', label: 'Good' };
    if (score >= 40) return { grade: 'C', color: '#FDCB6E', label: 'Average' };
    return { grade: 'D', color: '#E17055', label: 'Needs Improvement' };
  };

  const gradeInfo = getGrade(total);
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - total / 100);

  return (
    <div className="pscore-container card">
      <h3 className="pscore-title"><FiZap style={{ marginRight: '8px' }} />Productivity Score</h3>
      <p className="pscore-sub">AI-computed from your real activity data</p>

      <div className="pscore-main">
        <div className="pscore-gauge">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="52" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="65" cy="65" r="52" fill="none" stroke={gradeInfo.color} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="pscore-center">
            <div className="pscore-num" style={{ color: gradeInfo.color }}>{Math.round(total)}</div>
            <div className="pscore-grade" style={{ color: gradeInfo.color }}>{gradeInfo.grade}</div>
            <div className="pscore-label">{gradeInfo.label}</div>
          </div>
        </div>

        <div className="pscore-breakdown">
          {WEIGHTS.map(w => {
            const val = breakdown[w.key] || 0;
            const contribution = (val * w.weight) / 100;
            const IconComponent = w.Icon;
            return (
              <div key={w.key} className="pscore-row">
                <span className="pscore-icon"><IconComponent size={18} color={w.color} /></span>
                <div className="pscore-row-info">
                  <div className="pscore-row-header">
                    <span className="pscore-row-label">{w.label}</span>
                    <span className="pscore-row-val" style={{ color: w.color }}>{Math.round(val)}%</span>
                  </div>
                  <div className="pscore-bar">
                    <div className="pscore-bar-fill" style={{ width: `${val}%`, background: w.color }} />
                  </div>
                  <div className="pscore-weight">×{w.weight}% weight → {contribution.toFixed(1)} pts</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pscore-formula">
        <div className="formula-title">Formula:</div>
        <div className="formula-text">
          Score = (Tasks×0.25) + (Focus×0.20) + (Learning×0.20) + (Streak×0.15) + (Wellness×0.10) + (Goals×0.10)
        </div>
      </div>
    </div>
  );
}
