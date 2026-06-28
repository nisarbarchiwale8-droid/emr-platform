import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StaffFormModal } from './StaffFormModal.jsx';
import { staffService } from '../../services/index.js';
import { ROLE_LABELS } from '../../utils/constants.js';
import { fullName, formatDate } from '../../utils/format.js';

const ROLE_VARIANT = { ADMINISTRATOR: 'default', DOCTOR: 'success', RECEPTIONIST: 'warning' };
const STATUS_VARIANT = { ACTIVE: 'success', INACTIVE: 'muted', SUSPENDED: 'danger' };

export default function StaffPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['staff', page],
    queryFn: () => staffService.list({ page, limit: 15 }).then((r) => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id) => staffService.deactivate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Staff deactivated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const columns = [
    { key: 'name', header: 'Name', render: (r) => (
      <div>
        <p className="font-medium text-text-main">{fullName(r)}</p>
        <p className="text-small text-text-muted">{r.email}</p>
      </div>
    ) },
    { key: 'role', header: 'Role', render: (r) => <Badge variant={ROLE_VARIANT[r.role]}>{ROLE_LABELS[r.role]}</Badge> },
    { key: 'specialization', header: 'Specialization', render: (r) => r.doctorProfile?.specialization || '—' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge> },
    { key: 'lastLogin', header: 'Last Login', render: (r) => r.lastLoginAt ? formatDate(r.lastLoginAt) : 'Never' },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-main" title="Edit">
          <Pencil size={16} />
        </button>
        {r.status === 'ACTIVE' && (
          <button onClick={() => deactivate.mutate(r.id)} className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50" title="Deactivate">
            <UserX size={16} />
          </button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={16} /> Add Staff</Button>
      </div>
      <Card>
        <Table columns={columns} data={data?.data} loading={isLoading} emptyMessage="No staff members." />
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>
      <StaffFormModal open={modalOpen} onClose={() => setModalOpen(false)} staff={editing} />
    </div>
  );
}
