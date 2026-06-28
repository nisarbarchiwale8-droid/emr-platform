import { Badge } from './Badge.jsx';
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/constants.js';

const APPT_VARIANT = {
  SCHEDULED: 'muted',
  CONFIRMED: 'default',
  IN_QUEUE: 'warning',
  IN_CONSULTATION: 'default',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
};

const PAYMENT_VARIANT = {
  PENDING: 'danger',
  PARTIAL: 'warning',
  PAID: 'success',
  REFUNDED: 'muted',
  WAIVED: 'muted',
};

export function AppointmentStatusBadge({ status }) {
  return <Badge variant={APPT_VARIANT[status] || 'muted'}>{APPOINTMENT_STATUS_LABELS[status] || status}</Badge>;
}

export function PaymentStatusBadge({ status }) {
  return <Badge variant={PAYMENT_VARIANT[status] || 'muted'}>{PAYMENT_STATUS_LABELS[status] || status}</Badge>;
}
