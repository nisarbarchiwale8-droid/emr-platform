import { clsx } from 'clsx';
import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, hint, className, containerClassName, icon, ...props },
  ref
) {
  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label className="text-small font-medium text-text-main">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 rounded-[10px] border bg-bg-card text-text-main text-body placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors',
            'disabled:bg-bg-main disabled:cursor-not-allowed',
            error ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : 'border-border',
            icon && 'pl-9',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-small text-red-500">{error}</p>}
      {hint && !error && <p className="text-small text-text-muted">{hint}</p>}
    </div>
  );
});
