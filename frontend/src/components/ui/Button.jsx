import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark',
  secondary: 'bg-white text-text-main border border-border hover:bg-bg-main',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'text-text-main hover:bg-bg-main',
};

const sizes = {
  sm: 'px-4 py-2 text-small',
  md: 'px-6 py-2.5 text-body',
  lg: 'px-8 py-3 text-body',
  icon: 'p-2',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
