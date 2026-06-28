import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Users, TrendingUp, Stethoscope } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { reportService } from '../../services/index.js';
import { formatCurrency, toInputDate } from '../../utils/format.js';

export default function ReportsPage() {
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [from, setFrom] = useState(toInputDate(firstOfMonth));
  const [to, setTo] = useState(toInputDate(new Date()));

  const params = { from, to };

  const { data: revenue } = useQuery({ queryKey: ['report-revenue', from, to], queryFn: () => reportService.revenue(params).then((r) => r.data.data) });
  const { data: patients } = useQuery({ queryKey: ['report-patients', from, to], queryFn: () => reportService.patients(params).then((r) => r.data.data) });
  const { data: doctors } = useQuery({ queryKey: ['report-doctors', from, to], queryFn: () => reportService.doctorPerformance(params).then((r) => r.data.data) });

  const doctorColumns = [
    { key: 'name', header: 'Doctor', render: (r) => <span className="font-medium">Dr. {r.name}</span> },
    { key: 'total', header: 'Total Appointments', render: (r) => r.totalAppointments },
    { key: 'completed', header: 'Completed', render: (r) => <span className="text-accent-green font-medium">{r.completedAppointments}</span> },
    { key: 'rate', header: 'Completion Rate', render: (r) => r.totalAppointments ? `${Math.round((r.completedAppointments / r.totalAppointments) * 100)}%` : '—' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} containerClassName="w-44" />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} containerClassName="w-44" />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<IndianRupee size={20} className="text-accent-green" />} iconBg="bg-green-100" title="Collected" value={formatCurrency(revenue?.totalCollected || 0)} />
        <StatCard icon={<TrendingUp size={20} className="text-primary" />} iconBg="bg-indigo-100" title="Billed" value={formatCurrency(revenue?.totalBilled || 0)} />
        <StatCard icon={<IndianRupee size={20} className="text-accent-orange" />} iconBg="bg-orange-100" title="Outstanding" value={formatCurrency(revenue?.totalOutstanding || 0)} />
        <StatCard icon={<Users size={20} className="text-purple-500" />} iconBg="bg-purple-100" title="New Patients" value={patients?.newPatients ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          {revenue?.byMethod?.length ? (
            <div className="flex flex-col gap-2">
              {revenue.byMethod.map((m) => (
                <div key={m.method} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-body text-text-main">{m.method}</span>
                  <span className="font-medium">{formatCurrency(m.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-small text-text-muted py-4">No payments in range</p>}
        </Card>

        <Card>
          <CardHeader><CardTitle>Patient Mix</CardTitle></CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between"><span className="text-text-muted">New Patients</span><span className="font-medium">{patients?.newPatients ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Returning</span><span className="font-medium">{patients?.returningPatients ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Unique Visitors</span><span className="font-medium">{patients?.uniqueVisitors ?? '—'}</span></div>
            <div className="flex justify-between pt-2 border-t border-border"><span className="text-text-muted">Total Patients</span><span className="font-semibold text-primary">{patients?.totalPatients ?? '—'}</span></div>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between"><span className="text-text-muted">Bills Generated</span><span className="font-medium">{revenue?.billCount ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Payments Received</span><span className="font-medium">{revenue?.paymentCount ?? '—'}</span></div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle><span className="flex items-center gap-2"><Stethoscope size={18} /> Doctor Performance</span></CardTitle></CardHeader>
        <Table columns={doctorColumns} data={doctors?.doctors} emptyMessage="No doctor data" />
      </Card>
    </div>
  );
}
