import { useQuery } from '@tanstack/react-query';
import { Users, CalendarDays, IndianRupee, Activity, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { AppointmentStatusBadge } from '../../components/ui/StatusBadge.jsx';
import { dashboardService } from '../../services/index.js';
import { useAuthStore } from '../../store/auth.store.js';
import { formatCurrency, formatTime, fullName } from '../../utils/format.js';
import { ROLES } from '../../utils/constants.js';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => dashboardService.stats().then((r) => r.data.data) });
  const { data: appointments, isLoading } = useQuery({ queryKey: ['dashboard-today'], queryFn: () => dashboardService.todayAppointments().then((r) => r.data.data) });

  const isAdmin = user?.role === ROLES.ADMINISTRATOR;

  const statCards = [
    { icon: <Users size={20} className="text-primary" />, iconBg: 'bg-indigo-100', title: "Today's Patients", value: stats?.todaysPatients ?? '—' },
    { icon: <Activity size={20} className="text-accent-orange" />, iconBg: 'bg-orange-100', title: 'In Queue', value: stats?.queueLength ?? '—' },
    ...(isAdmin ? [
      { icon: <IndianRupee size={20} className="text-accent-green" />, iconBg: 'bg-green-100', title: "Today's Revenue", value: formatCurrency(stats?.todaysRevenue || 0) },
      { icon: <Clock size={20} className="text-red-400" />, iconBg: 'bg-red-100', title: 'Outstanding', value: formatCurrency(stats?.pendingAmount || 0) },
    ] : [
      { icon: <CalendarDays size={20} className="text-purple-500" />, iconBg: 'bg-purple-100', title: 'Appointments', value: stats?.todaysAppointments ?? '—' },
      { icon: <Users size={20} className="text-accent-green" />, iconBg: 'bg-green-100', title: 'Total Patients', value: stats?.totalActivePatients ?? '—' },
    ]),
  ];

  const columns = [
    { key: 'time', header: 'Time', render: (r) => <span className="font-medium">{formatTime(r.scheduledAt)}</span> },
    { key: 'token', header: 'Token', render: (r) => r.tokenNumber ? `#${r.tokenNumber}` : '—' },
    { key: 'patient', header: 'Patient', render: (r) => fullName(r.patient) },
    { key: 'doctor', header: 'Doctor', render: (r) => `Dr. ${fullName(r.doctor)}` },
    { key: 'status', header: 'Status', render: (r) => <AppointmentStatusBadge status={r.status} /> },
  ];

  const quickActions = [
    { label: 'Register Patient', to: '/patients' },
    { label: 'Book Appointment', to: '/appointments' },
    { label: 'View Queue', to: '/queue' },
    ...(isAdmin || user?.role === ROLES.RECEPTIONIST ? [{ label: 'Create Bill', to: '/billing' }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-h1 font-bold text-text-main">Welcome back, {user?.firstName} 👋</h2>
        <p className="text-body text-text-muted mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Today's Appointments</CardTitle></CardHeader>
            <Table columns={columns} data={appointments} loading={isLoading}
              emptyMessage="No appointments scheduled today"
              onRowClick={(r) => navigate('/appointments')} />
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <button key={action.to} onClick={() => navigate(action.to)}
                  className="w-full text-left px-4 py-3 rounded-[10px] bg-bg-main hover:bg-indigo-50 text-body text-text-main hover:text-primary transition-colors font-medium">
                  {action.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
