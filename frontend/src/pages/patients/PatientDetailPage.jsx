import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, Mail, MapPin, Droplet, Calendar, FileText, Stethoscope } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { AppointmentStatusBadge } from '../../components/ui/StatusBadge.jsx';
import { patientService, emrService } from '../../services/index.js';
import { GENDER_LABELS, BLOOD_GROUP_LABELS } from '../../utils/constants.js';
import { formatDate, formatDateTime, fullName, initials } from '../../utils/format.js';

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.get(id).then((r) => r.data.data),
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => emrService.timeline(id).then((r) => r.data.data),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="h-64 bg-bg-card rounded-2xl animate-pulse" />;
  }
  if (!patient) return <p className="text-text-muted">Patient not found.</p>;

  const infoRows = [
    { icon: Phone, label: 'Phone', value: patient.phone },
    { icon: Mail, label: 'Email', value: patient.email || '—' },
    { icon: Droplet, label: 'Blood Group', value: BLOOD_GROUP_LABELS[patient.bloodGroup] },
    { icon: MapPin, label: 'Address', value: [patient.address, patient.city, patient.pincode].filter(Boolean).join(', ') || '—' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate('/patients')} className="flex items-center gap-1 text-text-muted hover:text-primary text-body w-fit">
        <ArrowLeft size={16} /> Back to Patients
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center pb-4 border-b border-border">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold mb-3">
              {initials(patient)}
            </div>
            <h2 className="text-h2 font-semibold text-text-main">{fullName(patient)}</h2>
            <p className="text-small text-text-muted">{patient.uhid}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="default">{GENDER_LABELS[patient.gender]}</Badge>
              <Badge variant="muted">{patient.age ?? '—'} yrs</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-small text-text-muted">{label}</p>
                  <p className="text-body text-text-main">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <Button className="w-full mt-4" onClick={() => navigate('/appointments', { state: { patientId: patient.id } })}>
            <Calendar size={16} /> Book Appointment
          </Button>
        </Card>

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Medical Timeline</CardTitle>
            <Badge variant="muted">{timeline?.encounters?.length || 0} visits</Badge>
          </CardHeader>

          {!timeline?.encounters?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <FileText size={36} className="opacity-40 mb-2" />
              <p>No medical history yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {timeline.encounters.map((enc) => (
                <div key={enc.id} className="border border-border rounded-[10px] p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope size={16} className="text-primary" />
                      <span className="font-medium text-text-main">Dr. {fullName(enc.doctor)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AppointmentStatusBadge status={enc.status} />
                      <span className="text-small text-text-muted">{formatDate(enc.scheduledAt)}</span>
                    </div>
                  </div>
                  {enc.chiefComplaint && (
                    <p className="text-small text-text-muted mb-2"><span className="font-medium">Complaint:</span> {enc.chiefComplaint}</p>
                  )}
                  {enc.soapNote?.diagnoses?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {enc.soapNote.diagnoses.map((d) => (
                        <Badge key={d.id} variant="warning">{d.description}{d.icdCode ? ` (${d.icdCode})` : ''}</Badge>
                      ))}
                    </div>
                  )}
                  {enc.soapNote?.prescriptions?.length > 0 && (
                    <p className="text-small text-text-muted">
                      <span className="font-medium">Rx:</span> {enc.soapNote.prescriptions.map((p) => p.medicineName).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
