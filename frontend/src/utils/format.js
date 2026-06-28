import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(Number(amount) || 0);

export const formatDate = (date, pattern = 'dd MMM yyyy') => {
  if (!date) return '—';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, pattern);
  } catch {
    return '—';
  }
};

export const formatDateTime = (date) => formatDate(date, 'dd MMM yyyy, hh:mm a');
export const formatTime = (date) => formatDate(date, 'hh:mm a');

export const fullName = (person) =>
  person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() : '—';

export const initials = (person) =>
  person ? `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase() : '?';

export const toInputDate = (date) => {
  if (!date) return '';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};
