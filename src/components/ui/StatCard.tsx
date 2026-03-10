interface StatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  accent?: 'default' | 'success' | 'error' | 'primary';
  className?: string;
}

const accentClasses = {
  default: 'border-border-light',
  success: 'border-l-4 border-l-status-success border-t-border-light border-r-border-light border-b-border-light',
  error: 'border-l-4 border-l-status-error border-t-border-light border-r-border-light border-b-border-light',
  primary: 'border-l-4 border-l-primary border-t-border-light border-r-border-light border-b-border-light',
};

const trendColors = {
  up: 'text-stat-positive',
  down: 'text-stat-negative',
  neutral: 'text-stat-neutral',
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M17 7H7M17 7v10" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 7L7 17M7 17h10M7 17V7" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" />
    </svg>
  );
}

export function StatCard({ label, value, trend, trendLabel, accent = 'default', className = '' }: StatCardProps) {
  return (
    <div
      className={`bg-background-card rounded-xl p-5 shadow-stat border ${accentClasses[accent]} ${className}`}
    >
      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">{label}</p>
      <p className="text-metric-value font-tabular-nums mb-2">{value}</p>
      {trend && trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColors[trend]}`}>
          <TrendIcon trend={trend} />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
