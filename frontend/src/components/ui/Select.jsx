import { clsx } from 'clsx';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  { label, error, options = [], placeholder, className, containerClassName, children, ...props },
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
        <select
          ref={ref}
          className={clsx(
            'w-full appearance-none px-4 py-2.5 pr-10 rounded-[10px] border bg-bg-card text-text-main text-body',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors',
            'disabled:bg-bg-main disabled:cursor-not-allowed',
            error ? 'border-red-400' : 'border-border',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          {children}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      </div>
      {error && <p className="text-small text-red-500">{error}</p>}
    </div>
  );
});
