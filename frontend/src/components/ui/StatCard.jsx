export function StatCard({ icon, title, value, trend, trendLabel, iconBg = 'bg-indigo-100' }) {
  return (
    <div className="flex items-center gap-3 bg-bg-card p-4 rounded-xl shadow-card border border-border">
      <div className={`p-2.5 ${iconBg} rounded-full flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-small text-text-muted truncate">{title}</p>
        <h3 className="text-h2 font-semibold text-text-main">{value}</h3>
        {trendLabel && (
          <p className={`text-small mt-0.5 ${trend >= 0 ? 'text-accent-green' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}
