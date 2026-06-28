import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Phone, Pencil, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { PatientFormModal } from './PatientFormModal.jsx';
import { patientService } from '../../services/index.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { GENDER_LABELS, ROLES } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';
import { useAuthStore } from '../../store/auth.store.js';

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const debouncedSearch = useDebounce(search, 400);

  const canManage = [ROLES.ADMINISTRATOR, ROLES.RECEPTIONIST].includes(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', debouncedSearch, page],
    queryFn: () => patientService.list({ search: debouncedSearch, page, limit: 15 }).then((r) => r.data),
  });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setModalOpen(true); };

  const columns = [
    { key: 'uhid', header: 'UHID', render: (r) => <span className="font-medium text-primary">{r.uhid}</span> },
    { key: 'name', header: 'Patient', render: (r) => (
      <div>
        <p className="font-medium text-text-main">{r.firstName} {r.lastName}</p>
        <p className="text-small text-text-muted">{GENDER_LABELS[r.gender]} · {r.age ?? '—'} yrs</p>
      </div>
    ) },
    { key: 'phone', header: 'Phone', render: (r) => (
      <span className="flex items-center gap-1 text-text-muted"><Phone size={14} /> {r.phone}</span>
    ) },
    { key: 'city', header: 'City', render: (r) => r.city || '—' },
    { key: 'createdAt', header: 'Registered', render: (r) => formatDate(r.createdAt) },
    { key: 'actions', header: '', headerClassName: 'text-right', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/patients/${r.id}`); }}
          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-main" title="View">
          <Eye size={16} />
        </button>
        {canManage && (
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-main" title="Edit">
            <Pencil size={16} />
          </button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input placeholder="Search by name, phone, or UHID..." className="pl-9"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {canManage && (
          <Button onClick={openCreate}><Plus size={16} /> Register Patient</Button>
        )}
      </div>

      <Card>
        <Table
          columns={columns}
          data={data?.data}
          loading={isLoading}
          emptyMessage="No patients found. Register your first patient."
          onRowClick={(r) => navigate(`/patients/${r.id}`)}
        />
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>

      <PatientFormModal open={modalOpen} onClose={() => setModalOpen(false)} patient={editing} />
    </div>
  );
}
