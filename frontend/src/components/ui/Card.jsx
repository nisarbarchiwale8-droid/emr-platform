import { clsx } from 'clsx';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={clsx('bg-bg-card rounded-2xl p-4 shadow-card border border-border', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return (
    <h2 className={clsx('text-h2 font-semibold text-text-main', className)}>
      {children}
    </h2>
  );
}
