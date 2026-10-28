import './FacultyComponents.css'

export default function FacultyCardSkeleton({ height = '120px', count = 1, className = '' }) {
  return (
    <div className={`faculty-skeleton-grid ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="faculty-card-skeleton"
          style={{ minHeight: height }}
          role="status"
          aria-label="Loading content"
        >
          <div className="faculty-skeleton-shimmer" />
          <div className="faculty-skeleton-row faculty-skeleton-header">
            <span className="faculty-skeleton-icon" />
            <span className="faculty-skeleton-line short" />
          </div>
          <div className="faculty-skeleton-row faculty-skeleton-body">
            <span className="faculty-skeleton-line number" />
            <span className="faculty-skeleton-line subtitle" />
          </div>
        </div>
      ))}
    </div>
  )
}
