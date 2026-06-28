import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { patientService, appointmentService } from '../../services/index.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { fullName } from '../../utils/format.js';

export function AppointmentFormModal({ open, onClose, defaultPatientId }) {
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const debounced = useDebounce(patientSearch, 350);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: patientResults } = useQuery({
    queryKey: ['patient-search', debounced],
    queryFn: () => patientService.list({ search: debounced, limit: 8 }).then((r) => r.data.data),
    enabled: debounced.length >= 2 && !selectedPatient,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => appointmentService.doctors().then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => appointmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked');
      handleClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to book appointment'),
  });

  const handleClose = () => {
    reset(); setSelectedPatient(null); setPatientSearch(''); onClose();
  };

  const onSubmit = (data) => {
    const patientId = selectedPatient?.id || defaultPatientId;
    if (!patientId) return toast.error('Please select a patient');
    mutation.mutate({
      patientId,
      doctorId: data.doctorId,
      scheduledAt: new Date(data.scheduledAt).toISOString(),
      chiefComplaint: data.chiefComplaint,
      type: data.type,
    });
  };

  const doctorOptions = (doctors || []).map((d) => ({
    value: d.id,
    label: `Dr. ${fullName(d)}${d.doctorProfile?.specialization ? ` — ${d.doctorProfile.specialization}` : ''}`,
  }));

  return (
    <Modal open={open} onClose={handleClose} title="Book Appointment" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>Book Appointment</Button>
        </>
      }>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Patient selector */}
        {selectedPatient ? (
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-indigo-50 border border-indigo-100">
            <div>
              <p className="font-medium text-text-main">{fullName(selectedPatient)}</p>
              <p className="text-small text-text-muted">{selectedPatient.uhid} · {selectedPatient.phone}</p>
            </div>
            <button type="button" onClick={() => setSelectedPatient(null)} className="text-small text-primary">Change</button>
          </div>
        ) : (
          <div className="relative">
            <Input label="Patient" required placeholder="Search name, phone, or UHID..."
              value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
            {patientResults?.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-bg-card border border-border rounded-[10px] shadow-dropdown max-h-56 overflow-y-auto scrollbar-thin">
                {patientResults.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(''); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-bg-main border-b border-border last:border-0">
                    <p className="font-medium text-text-main text-body">{fullName(p)}</p>
                    <p className="text-small text-text-muted">{p.uhid} · {p.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Select label="Doctor" required placeholder="Select doctor" options={doctorOptions}
          error={errors.doctorId?.message} {...register('doctorId', { required: 'Doctor is required' })} />

        <Input label="Date & Time" type="datetime-local" required
          error={errors.scheduledAt?.message} {...register('scheduledAt', { required: 'Date/time is required' })} />

        <Select label="Type" options={[
          { value: 'CONSULTATION', label: 'Consultation' },
          { value: 'FOLLOW_UP', label: 'Follow-up' },
          { value: 'PROCEDURE', label: 'Procedure' },
        ]} {...register('type')} />

        <Input label="Chief Complaint" placeholder="e.g. Fever, cough for 3 days" {...register('chiefComplaint')} />
      </form>
    </Modal>
  );
}
