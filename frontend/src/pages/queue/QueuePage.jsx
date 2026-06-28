import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Clock, Stethoscope, ChevronRight, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { appointmentService, queueService } from '../../services/index.js';
import { fullName } from '../../utils/format.js';
import { GENDER_LABELS } from '../../utils/constants.js';

export default function QueuePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn: () => queueService.get().then((r) => r.data.data),
    refetchInterval: 15000, // live refresh every 15s
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentService.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const summary = data?.summary || { total: 0, waiting: 0, inConsultation: 0 };
  const items = data?.items || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Activity size={20} className="text-primary" />} title="In Queue Today" value={summary.total} iconBg="bg-indigo-100" />
        <StatCard icon={<Clock size={20} className="text-accent-orange" />} title="Waiting" value={summary.waiting} iconBg="bg-orange-100" />
        <StatCard icon={<Stethoscope size={20} className="text-accent-green" />} title="In Consultation" value={summary.inConsultation} iconBg="bg-green-100" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 font-semibold">Live Queue</h2>
          <Badge variant="muted">Auto-refreshing</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-main rounded-[10px] animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Activity size={40} className="opacity-40 mb-3" />
            <p>Queue is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className={`flex items-center gap-4 p-4 rounded-[10px] border transition-colors ${
                item.status === 'IN_CONSULTATION' ? 'border-primary bg-indigo-50/50' : 'border-border'
              }`}>
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                  #{item.tokenNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-main">{fullName(item.patient)}</p>
                  <p className="text-small text-text-muted">
                    {item.patient?.uhid} · {GENDER_LABELS[item.patient?.gender]} · {item.patient?.age ?? '—'} yrs
                  </p>
                  {item.chiefComplaint && <p className="text-small text-text-muted mt-0.5">{item.chiefComplaint}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.vitals?.id ? (
                    <Badge variant="success"><Heart size={12} className="inline mr-1" />Vitals done</Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/vitals?appointmentId=${item.id}`)}>
                      Record Vitals
                    </Button>
                  )}
                  {item.status === 'IN_QUEUE' ? (
                    <Button size="sm" onClick={() => statusMutation.mutate({ id: item.id, status: 'IN_CONSULTATION' })}>
                      Start <ChevronRight size={14} />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => navigate(`/emr?appointmentId=${item.id}`)}>
                      Open EMR <ChevronRight size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
