import { Bell, Search, X, Calendar, UserPlus, CreditCard, Clock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import { dashboardService } from '../services/index.js';
import { formatTime } from '../utils/format.js';

// ─── Notification helpers ─────────────────────────────────────────────────────

const ICONS = {
  appointment: { icon: Calendar, bg: 'bg-primary/10', color: 'text-primary' },
  patient: { icon: UserPlus, bg: 'bg-accent-green/10', color: 'text-accent-green' },
  billing: { icon: CreditCard, bg: 'bg-accent-orange/10', color: 'text-accent-orange' },
  queue: { icon: Clock, bg: 'bg-purple-100', color: 'text-purple-600' },
};

function NotifIcon({ type }) {
  const cfg = ICONS[type] || ICONS.appointment;
  const Icon = cfg.icon;
  return (
    <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
      <Icon size={16} className={cfg.color} />
    </div>
  );
}

// Build notifications from today's appointments data
function buildNotifications(appointments = []) {
  const now = new Date();
  const notifs = [];

  appointments.slice(0, 10).forEach((appt) => {
    const scheduledAt = new Date(appt.scheduledAt);
    const minutesUntil = Math.round((scheduledAt - now) / 60000);
    const patientName = appt.patient
      ? `${appt.patient.firstName} ${appt.patient.lastName}`
      : 'Patient';

    if (appt.status === 'SCHEDULED' && minutesUntil > 0 && minutesUntil <= 30) {
      notifs.push({
        id: `soon-${appt.id}`,
        type: 'queue',
        title: 'Appointment in ' + minutesUntil + ' min',
        body: `${patientName} · Token #${appt.tokenNumber ?? '—'}`,
        time: formatTime(appt.scheduledAt),
        link: '/queue',
      });
    } else if (appt.status === 'SCHEDULED') {
      notifs.push({
        id: `appt-${appt.id}`,
        type: 'appointment',
        title: 'Upcoming appointment',
        body: `${patientName} at ${formatTime(appt.scheduledAt)}`,
        time: formatTime(appt.scheduledAt),
        link: '/appointments',
      });
    } else if (appt.status === 'IN_QUEUE') {
      notifs.push({
        id: `inq-${appt.id}`,
        type: 'queue',
        title: 'Patient waiting in queue',
        body: `${patientName} · Token #${appt.tokenNumber ?? '—'}`,
        time: 'Now',
        link: '/queue',
      });
    }
  });

  return notifs.slice(0, 8);
}

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(new Set());

  const { data: todayData, isLoading } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => dashboardService.todayAppointments().then((r) => r.data.data),
    refetchInterval: 60000, // refresh every minute
  });

  const all = buildNotifications(todayData || []);
  const notifications = all.filter((n) => !dismissed.has(n.id));

  const handleClick = (notif) => {
    navigate(notif.link);
    onClose();
  };

  const dismiss = (e, id) => {
    e.stopPropagation();
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-bg-card rounded-2xl border border-border shadow-lg z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary" />
          <span className="font-semibold text-text-main text-body">Notifications</span>
          {notifications.length > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {notifications.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-bg-main flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-bg-main rounded w-3/4" />
                  <div className="h-3 bg-bg-main rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-muted">
            <Bell size={32} className="opacity-20 mb-2" />
            <p className="text-small">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-bg-main cursor-pointer transition-colors group"
              >
                <NotifIcon type={notif.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-semibold text-text-main leading-snug">{notif.title}</p>
                  <p className="text-small text-text-muted truncate mt-0.5">{notif.body}</p>
                  <p className="text-xs text-text-muted mt-1">{notif.time}</p>
                </div>
                <button
                  onClick={(e) => dismiss(e, notif.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all flex-shrink-0 mt-0.5"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <button
          onClick={() => { navigate('/queue'); onClose(); }}
          className="text-small text-primary font-medium hover:underline w-full text-center"
        >
          View all in Queue →
        </button>
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar({ title }) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const { data: todayData } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => dashboardService.todayAppointments().then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const unreadCount = buildNotifications(todayData || []).length;

  return (
    <header className="flex items-center justify-between bg-bg-card px-6 py-3 border-b border-border sticky top-0 z-10">
      <h1 className="text-h2 font-semibold text-text-main">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Search patients, appointments..."
            className="w-72 pl-9 pr-4 py-2 rounded-full border border-border bg-bg-main text-body text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-[10px] border transition-colors relative ${
              open
                ? 'bg-primary text-white border-primary'
                : 'bg-bg-main border-border text-text-muted hover:text-text-main'
            }`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && <NotificationPanel onClose={() => setOpen(false)} />}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-small font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="hidden lg:block">
            <p className="text-body font-medium text-text-main leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-small text-text-muted capitalize mt-0.5">
              {user?.role?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
