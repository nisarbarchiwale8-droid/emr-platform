import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, IndianRupee } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { PaymentStatusBadge } from '../../components/ui/StatusBadge.jsx';
import { BillFormModal } from './BillFormModal.jsx';
import { PaymentModal } from './PaymentModal.jsx';
import { billingService } from '../../services/index.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { formatCurrency, formatDate, fullName } from '../../utils/format.js';

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [billModal, setBillModal] = useState(false);
  const [payBill, setPayBill] = useState(null);
  const debounced = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', debounced, statusFilter, page],
    queryFn: () => billingService.list({ search: debounced, paymentStatus: statusFilter, page, limit: 15 }).then((r) => r.data),
  });

  const columns = [
    { key: 'billNumber', header: 'Bill No.', render: (r) => <span className="font-medium text-primary">{r.billNumber}</span> },
    { key: 'patient', header: 'Patient', render: (r) => (
      <div>
        <p className="font-medium text-text-main">{fullName(r.patient)}</p>
        <p className="text-small text-text-muted">{r.patient?.uhid}</p>
      </div>
    ) },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.billDate) },
    { key: 'total', header: 'Total', render: (r) => <span className="font-medium">{formatCurrency(r.totalAmount)}</span> },
    { key: 'due', header: 'Due', render: (r) => Number(r.dueAmount) > 0 ? <span className="text-red-500">{formatCurrency(r.dueAmount)}</span> : '—' },
    { key: 'status', header: 'Status', render: (r) => <PaymentStatusBadge status={r.paymentStatus} /> },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      Number(r.dueAmount) > 0 && r.status !== 'CANCELLED' ? (
        <Button size="sm" onClick={(e) => { e.stopPropagation(); setPayBill(r); }}>Collect</Button>
      ) : null
    ) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input placeholder="Search bill no. or patient..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select containerClassName="w-44" placeholder="All payments" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'PARTIAL', label: 'Partial' },
              { value: 'PAID', label: 'Paid' },
            ]} />
        </div>
        <Button onClick={() => setBillModal(true)}><Plus size={16} /> Create Bill</Button>
      </div>

      <Card>
        <Table columns={columns} data={data?.data} loading={isLoading} emptyMessage="No bills found." />
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>

      <BillFormModal open={billModal} onClose={() => setBillModal(false)} />
      <PaymentModal open={Boolean(payBill)} onClose={() => setPayBill(null)} bill={payBill} />
    </div>
  );
}
