import { clsx } from 'clsx';

const variants = {
  default: 'bg-indigo-100 text-primary',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-600',
  muted: 'bg-bg-main text-text-muted',
};

export function Badge({ children, variant = 'default', className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
