import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { appointmentService, vitalsService } from '../../services/index.js';
import { fullName } from '../../utils/format.js';

const FIELDS = [
  { name: 'temperature', label: 'Temperature (°C)', step: '0.1' },
  { name: 'pulseRate', label: 'Pulse (bpm)' },
  { name: 'systolicBP', label: 'Systolic BP (mmHg)' },
  { name: 'diastolicBP', label: 'Diastolic BP (mmHg)' },
  { name: 'respiratoryRate', label: 'Respiratory Rate' },
  { name: 'oxygenSaturation', label: 'SpO₂ (%)', step: '0.1' },
  { name: 'weight', label: 'Weight (kg)', step: '0.1' },
  { name: 'height', label: 'Height (cm)', step: '0.1' },
  { name: 'bloodGlucose', label: 'Blood Glucose (mg/dL)', step: '0.1' },
];

export default function VitalsPage() {
  const [params] = useSearchParams();
  const appointmentId = params.get('appointmentId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: appointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentService.get(appointmentId).then((r) => r.data.data),
    enabled: Boolean(appointmentId),
  });

  const { data: vitals } = useQuery({
    queryKey: ['vitals', appointmentId],
    queryFn: () => vitalsService.get(appointmentId).then((r) => r.data.data),
    enabled: Boolean(appointmentId),
  });

  const { register, handleSubmit } = useForm({ values: vitals || {} });

  const mutation = useMutation({
    mutationFn: (data) => vitalsService.save(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Vitals recorded');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save vitals'),
  });

  const onSubmit = (data) => {
    const payload = Object.fromEntries(
      Object.entries(data)
        .filter(([k]) => FIELDS.some((f) => f.name === k) || k === 'notes')
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => [k, k === 'notes' ? v : Number(v)])
    );
    mutation.mutate(payload);
  };

  if (!appointmentId) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Activity size={40} className="opacity-40 mb-3" />
          <p>Select a patient from the Queue to record vitals</p>
          <Button className="mt-4" onClick={() => navigate('/queue')}>Go to Queue</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <button onClick={() => navigate('/queue')} className="flex items-center gap-1 text-text-muted hover:text-primary text-body w-fit">
        <ArrowLeft size={16} /> Back to Queue
      </button>

      {appointment && (
        <Card className="bg-indigo-50/50 border-indigo-100">
          <p className="font-medium text-text-main">{fullName(appointment.patient)}</p>
          <p className="text-small text-text-muted">{appointment.patient?.uhid} · {appointment.patient?.phone}</p>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Record Vitals</CardTitle></CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FIELDS.map((f) => (
            <Input key={f.name} label={f.label} type="number" step={f.step || '1'} {...register(f.name)} />
          ))}
          <Input label="Notes" containerClassName="sm:col-span-3" {...register('notes')} />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" loading={mutation.isPending}>Save Vitals</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
