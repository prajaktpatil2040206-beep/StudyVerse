// Reusable skeleton loading components
import './SkeletonLoader.css';

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text-short" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="skeleton-profile">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      <div className="skeleton skeleton-text-short" style={{ width: '40%' }} />
    </div>
  );
}

export function SkeletonList({ items = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text-short" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetric() {
  return (
    <div className="skeleton-metric">
      <div className="skeleton skeleton-icon" />
      <div className="skeleton skeleton-number" />
      <div className="skeleton skeleton-label" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skeleton-chart">
      <div className="skeleton skeleton-chart-bar" style={{ height: '60%' }} />
      <div className="skeleton skeleton-chart-bar" style={{ height: '80%' }} />
      <div className="skeleton skeleton-chart-bar" style={{ height: '40%' }} />
      <div className="skeleton skeleton-chart-bar" style={{ height: '90%' }} />
      <div className="skeleton skeleton-chart-bar" style={{ height: '70%' }} />
    </div>
  );
}
