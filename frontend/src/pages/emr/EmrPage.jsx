import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { Stethoscope, ArrowLeft, Plus, Trash2, Pill, ClipboardList, Mic, MicOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { appointmentService, emrService, vitalsService } from '../../services/index.js';
import { fullName } from '../../utils/format.js';
import { useVoiceInput } from '../../hooks/useVoiceInput.js';

// ─── Voice Textarea ────────────────────────────────────────────────────────────

function SoapTextarea({ label, register, name, placeholder, setValue, getValues }) {
  const handleVoiceResult = useCallback(
    (transcript) => {
      const current = getValues(name) || '';
      setValue(name, current ? `${current} ${transcript}` : transcript, { shouldDirty: true });
    },
    [name, setValue, getValues]
  );

  const { isListening, toggle, supported, error } = useVoiceInput({ onResult: handleVoiceResult });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-small font-medium text-text-main">{label}</label>
        {supported && (
          <button
            type="button"
            onClick={toggle}
            title={isListening ? 'Stop recording' : 'Start voice input'}
            className={`flex items-center gap-1 px-2 py-1 rounded-[8px] text-xs font-medium transition-all ${
              isListening
                ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                : 'bg-bg-main text-text-muted border border-border hover:text-primary hover:border-primary'
            }`}
          >
            {isListening ? <MicOff size={12} /> : <Mic size={12} />}
            {isListening ? 'Stop' : 'Voice'}
          </button>
        )}
      </div>

      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-red-50 border border-red-100">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs text-red-600">Listening… speak now</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      <textarea
        {...register(name)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-2.5 rounded-[10px] border border-border bg-bg-card text-body text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
      />
    </div>
  );
}

// ─── Main EMR Page ─────────────────────────────────────────────────────────────

export default function EmrPage() {
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

  const { data: soap } = useQuery({
    queryKey: ['soap', appointmentId],
    queryFn: () => emrService.getSoap(appointmentId).then((r) => r.data.data),
    enabled: Boolean(appointmentId),
  });

  const { register, control, handleSubmit, reset, setValue, getValues } = useForm({
    defaultValues: {
      subjective: '', objective: '', assessment: '', plan: '',
      followUpDays: '', diagnoses: [], prescriptions: [],
    },
  });

  const diagnoses = useFieldArray({ control, name: 'diagnoses' });
  const prescriptions = useFieldArray({ control, name: 'prescriptions' });

  useEffect(() => {
    if (soap) {
      reset({
        subjective: soap.subjective || '',
        objective: soap.objective || '',
        assessment: soap.assessment || '',
        plan: soap.plan || '',
        followUpDays: soap.followUpDays || '',
        diagnoses: soap.diagnoses?.map((d) => ({ icdCode: d.icdCode, description: d.description, type: d.type })) || [],
        prescriptions: soap.prescriptions?.map((p) => ({
          medicineName: p.medicineName, dosage: p.dosage, frequency: p.frequency,
          duration: p.duration, instructions: p.instructions,
        })) || [],
      });
    }
  }, [soap, reset]);

  const mutation = useMutation({
    mutationFn: (data) => emrService.saveSoap(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soap', appointmentId] });
      toast.success('Consultation saved');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const completeMutation = useMutation({
    mutationFn: () => appointmentService.changeStatus(appointmentId, 'COMPLETED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Consultation completed');
      navigate('/queue');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to complete'),
  });

  const buildPayload = (data) => ({
    ...data,
    followUpDays: data.followUpDays ? parseInt(data.followUpDays, 10) : null,
    diagnoses: data.diagnoses.filter((d) => d.description?.trim()),
    prescriptions: data.prescriptions.filter((p) => p.medicineName?.trim()),
  });

  const onSaveDraft = (data) => mutation.mutate(buildPayload(data));
  const onSaveAndComplete = (data) =>
    mutation.mutate(buildPayload(data), { onSuccess: () => completeMutation.mutate() });

  if (!appointmentId) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Stethoscope size={40} className="opacity-40 mb-3" />
          <p>Select a patient from the Queue to begin consultation</p>
          <Button className="mt-4" onClick={() => navigate('/queue')}>Go to Queue</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate('/queue')} className="flex items-center gap-1 text-text-muted hover:text-primary text-body w-fit">
        <ArrowLeft size={16} /> Back to Queue
      </button>

      {/* Patient header + vitals strip */}
      {appointment && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-h2 font-semibold text-text-main">{fullName(appointment.patient)}</p>
              <p className="text-small text-text-muted">
                {appointment.patient?.uhid} · {appointment.patient?.age ?? '—'} yrs · {appointment.patient?.gender}
              </p>
              {appointment.chiefComplaint && (
                <p className="text-small text-text-muted mt-1">Complaint: {appointment.chiefComplaint}</p>
              )}
            </div>
            {vitals && (
              <div className="flex gap-2 flex-wrap">
                {vitals.temperature && <Badge variant="muted">🌡 {vitals.temperature}°C</Badge>}
                {vitals.pulseRate && <Badge variant="muted">❤️ {vitals.pulseRate} bpm</Badge>}
                {vitals.systolicBP && <Badge variant="muted">BP {vitals.systolicBP}/{vitals.diastolicBP}</Badge>}
                {vitals.oxygenSaturation && <Badge variant="muted">SpO₂ {vitals.oxygenSaturation}%</Badge>}
                {vitals.bmi && <Badge variant="muted">BMI {vitals.bmi}</Badge>}
              </div>
            )}
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSaveDraft)} className="flex flex-col gap-4">
        {/* SOAP Notes with Voice Input */}
        <Card>
          <CardHeader>
            <CardTitle>SOAP Notes</CardTitle>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-primary/5 border border-primary/20">
              <Mic size={13} className="text-primary" />
              <span className="text-xs text-primary font-medium">Voice-to-Text enabled</span>
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SoapTextarea
              label="Subjective"
              name="subjective"
              register={register}
              setValue={setValue}
              getValues={getValues}
              placeholder="Patient's symptoms, history…"
            />
            <SoapTextarea
              label="Objective"
              name="objective"
              register={register}
              setValue={setValue}
              getValues={getValues}
              placeholder="Examination findings…"
            />
            <SoapTextarea
              label="Assessment"
              name="assessment"
              register={register}
              setValue={setValue}
              getValues={getValues}
              placeholder="Clinical assessment…"
            />
            <SoapTextarea
              label="Plan"
              name="plan"
              register={register}
              setValue={setValue}
              getValues={getValues}
              placeholder="Treatment plan…"
            />
          </div>
        </Card>

        {/* Diagnoses */}
        <Card>
          <CardHeader>
            <CardTitle><span className="flex items-center gap-2"><ClipboardList size={18} /> Diagnosis</span></CardTitle>
            <Button type="button" size="sm" variant="secondary"
              onClick={() => diagnoses.append({ icdCode: '', description: '', type: 'PRIMARY' })}>
              <Plus size={14} /> Add
            </Button>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {diagnoses.fields.length === 0 && <p className="text-small text-text-muted py-2">No diagnoses added</p>}
            {diagnoses.fields.map((field, i) => (
              <div key={field.id} className="flex gap-2 items-start">
                <Input containerClassName="w-32" placeholder="ICD-10" {...register(`diagnoses.${i}.icdCode`)} />
                <Input containerClassName="flex-1" placeholder="Diagnosis description" {...register(`diagnoses.${i}.description`)} />
                <button type="button" onClick={() => diagnoses.remove(i)} className="p-2.5 text-text-muted hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle><span className="flex items-center gap-2"><Pill size={18} /> Prescription</span></CardTitle>
            <Button type="button" size="sm" variant="secondary"
              onClick={() => prescriptions.append({ medicineName: '', dosage: '', frequency: '', duration: '' })}>
              <Plus size={14} /> Add Medicine
            </Button>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {prescriptions.fields.length === 0 && <p className="text-small text-text-muted py-2">No medicines added</p>}
            {prescriptions.fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                <Input containerClassName="sm:col-span-4" placeholder="Medicine name" {...register(`prescriptions.${i}.medicineName`)} />
                <Input containerClassName="sm:col-span-2" placeholder="Dosage" {...register(`prescriptions.${i}.dosage`)} />
                <Input containerClassName="sm:col-span-2" placeholder="Frequency" {...register(`prescriptions.${i}.frequency`)} />
                <Input containerClassName="sm:col-span-2" placeholder="Duration" {...register(`prescriptions.${i}.duration`)} />
                <Input containerClassName="sm:col-span-1" placeholder="Notes" {...register(`prescriptions.${i}.instructions`)} />
                <button type="button" onClick={() => prescriptions.remove(i)} className="p-2.5 text-text-muted hover:text-red-500 sm:col-span-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Follow-up + Actions */}
        <Card>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <Input label="Follow-up after (days)" type="number" containerClassName="w-48" {...register('followUpDays')} />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" loading={mutation.isPending}>Save Draft</Button>
              <Button type="button" loading={completeMutation.isPending || mutation.isPending}
                onClick={handleSubmit(onSaveAndComplete)}>
                Save & Complete
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
