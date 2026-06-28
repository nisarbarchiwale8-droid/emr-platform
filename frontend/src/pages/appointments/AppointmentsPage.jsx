import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, ChevronRight, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { AppointmentStatusBadge } from '../../components/ui/StatusBadge.jsx';
import { AppointmentFormModal } from './AppointmentFormModal.jsx';
import { appointmentService } from '../../services/index.js';
import { formatTime, fullName, toInputDate } from '../../utils/format.js';
import { useAuthStore } from '../../store/auth.store.js';
import { ROLES } from '../../utils/constants.js';

const NEXT_ACTION = {
  SCHEDULED: { status: 'IN_QUEUE', label: 'Send to Queue' },
  CONFIRMED: { status: 'IN_QUEUE', label: 'Send to Queue' },
  IN_QUEUE: { status: 'IN_CONSULTATION', label: 'Start Consultation' },
  IN_CONSULTATION: { status: 'COMPLETED', label: 'Complete' },
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(toInputDate(new Date()));
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(Boolean(location.state?.patientId));

  const canManage = [ROLES.ADMINISTRATOR, ROLES.RECEPTIONIST].includes(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', date, statusFilter],
    queryFn: () => appointmentService.list({ date, status: statusFilter, limit: 50 }).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentService.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const columns = [
    { key: 'time', header: 'Time', render: (r) => <span className="font-medium">{formatTime(r.scheduledAt)}</span> },
    { key: 'token', header: 'Token', render: (r) => r.tokenNumber ? <span className="font-semibold text-primary">#{r.tokenNumber}</span> : '—' },
    { key: 'patient', header: 'Patient', render: (r) => (
      <div>
        <p className="font-medium text-text-main">{fullName(r.patient)}</p>
        <p className="text-small text-text-muted">{r.patient?.uhid} · {r.patient?.phone}</p>
      </div>
    ) },
    { key: 'doctor', header: 'Doctor', render: (r) => `Dr. ${fullName(r.doctor)}` },
    { key: 'complaint', header: 'Complaint', render: (r) => r.chiefComplaint || '—' },
    { key: 'status', header: 'Status', render: (r) => <AppointmentStatusBadge status={r.status} /> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => {
      const next = NEXT_ACTION[r.status];
      const isTerminal = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(r.status);
      return (
        <div className="flex items-center justify-end gap-1">
          {next && (
            <Button size="sm" variant="secondary"
              onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: r.id, status: next.status }); }}>
              {next.label} <ChevronRight size={14} />
            </Button>
          )}
          {!isTerminal && canManage && (
            <button onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(r.id); }}
              className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50" title="Cancel">
              <X size={16} />
            </button>
          )}
        </div>
      );
    } },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} containerClassName="w-44" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} containerClassName="w-44"
            placeholder="All statuses" options={[
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'IN_QUEUE', label: 'In Queue' },
              { value: 'IN_CONSULTATION', label: 'In Consultation' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]} />
        </div>
        {canManage && <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Book Appointment</Button>}
      </div>

      <Card>
        <Table columns={columns} data={data?.data} loading={isLoading}
          emptyMessage="No appointments for this day."
          onRowClick={(r) => navigate(`/patients/${r.patient?.id}`)} />
      </Card>

      <AppointmentFormModal open={modalOpen} onClose={() => setModalOpen(false)}
        defaultPatientId={location.state?.patientId} />
    </div>
  );
}
