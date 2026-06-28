import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Stethoscope, Calendar, Clock, User, Phone, ChevronRight,
  CheckCircle, Loader2, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

const todayStr = () => new Date().toISOString().split('T')[0];

const buildISO = (dateStr, timeStr) => {
  const [h, m] = timeStr.split(':');
  const d = new Date(dateStr);
  d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return d.toISOString();
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }) {
  const steps = ['Your Details', 'Pick Slot', 'Confirm'];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < current ? 'bg-[#7BC67E] border-[#7BC67E] text-white'
              : i === current ? 'bg-[#5A5FEF] border-[#5A5FEF] text-white'
              : 'bg-white border-[#E6E8EC] text-[#9CA3AF]'
            }`}>
              {i < current ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium ${i === current ? 'text-[#5A5FEF]' : 'text-[#9CA3AF]'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 h-0.5 mb-5 mx-1 ${i < current ? 'bg-[#7BC67E]' : 'bg-[#E6E8EC]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const { clinicCode } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm();

  // Fetch clinic info
  const { data: clinic, isLoading, error } = useQuery({
    queryKey: ['public-clinic', clinicCode],
    queryFn: () => axios.get(`/api/v1/public/clinic/${clinicCode}`).then((r) => r.data.data),
  });

  const bookMutation = useMutation({
    mutationFn: (payload) => axios.post(`/api/v1/public/book/${clinicCode}`, payload).then((r) => r.data.data),
    onSuccess: (data) => {
      setBookingResult(data);
      setStep(3);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Booking failed. Please try again.'),
  });

  const onStep0Submit = (data) => {
    if (!selectedDoctor) { toast.error('Please select a doctor'); return; }
    setStep(1);
  };

  const onStep1Next = () => {
    if (!selectedTime) { toast.error('Please select a time slot'); return; }
    setStep(2);
  };

  const onConfirm = () => {
    const formData = getValues();
    bookMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      gender: formData.gender,
      age: formData.age,
      doctorId: selectedDoctor.id,
      scheduledAt: buildISO(selectedDate, selectedTime),
      chiefComplaint: formData.chiefComplaint,
    });
  };

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[#5A5FEF]" />
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1F2937] mb-2">Clinic Not Found</h2>
          <p className="text-[#9CA3AF]">This QR code may be invalid or the clinic may have been deactivated.</p>
        </div>
      </div>
    );
  }

  // ── Success Screen ──
  if (step === 3 && bookingResult) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E6E8EC] overflow-hidden">
            <div className="bg-gradient-to-b from-[#6C63FF] to-[#4B50D1] p-8 text-center text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={36} />
              </div>
              <h2 className="text-xl font-bold">Appointment Booked!</h2>
              <p className="text-white/80 text-sm mt-1">Your token number is</p>
              <div className="mt-3 w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto">
                <span className="text-4xl font-black text-[#5A5FEF]">{bookingResult.tokenNumber}</span>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <Row label="Patient" value={bookingResult.patientName} />
              <Row label="UHID" value={bookingResult.uhid} />
              <Row label="Doctor" value={bookingResult.doctorName} />
              <Row label="Date" value={formatDate(bookingResult.scheduledAt)} />
              <Row label="Time" value={formatTime(bookingResult.scheduledAt)} />
              <Row label="Clinic" value={bookingResult.clinicName} />
            </div>
            <div className="px-6 pb-6">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-700 text-center">
                  📋 Please show this screen or note your <strong>Token #{bookingResult.tokenNumber}</strong> when you arrive at the clinic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Booking Form ──
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* Clinic header */}
      <div className="bg-gradient-to-b from-[#6C63FF] to-[#4B50D1] px-6 pt-10 pb-16 text-white text-center">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <Stethoscope size={28} />
        </div>
        <h1 className="text-xl font-bold">{clinic.name}</h1>
        {clinic.address && <p className="text-white/70 text-sm mt-1">{clinic.address}</p>}
        {clinic.phone && <p className="text-white/70 text-sm">{clinic.phone}</p>}
      </div>

      {/* Card floats over header */}
      <div className="px-4 -mt-10 pb-10 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6E8EC] p-6">
          <Steps current={step} />

          {/* ── Step 0: Patient Details + Doctor ── */}
          {step === 0 && (
            <form onSubmit={handleSubmit(onStep0Submit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" error={errors.firstName?.message}>
                  <input className={inputCls(errors.firstName)} placeholder="Rahul"
                    {...register('firstName', { required: 'Required' })} />
                </Field>
                <Field label="Last Name" error={errors.lastName?.message}>
                  <input className={inputCls(errors.lastName)} placeholder="Sharma"
                    {...register('lastName', { required: 'Required' })} />
                </Field>
              </div>

              <Field label="Mobile Number" error={errors.phone?.message}>
                <input className={inputCls(errors.phone)} type="tel" placeholder="9999999999"
                  {...register('phone', {
                    required: 'Mobile number is required',
                    pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit number' },
                  })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Gender" error={errors.gender?.message}>
                  <select className={inputCls(errors.gender)}
                    {...register('gender', { required: 'Required' })}>
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
                <Field label="Age (optional)">
                  <input className={inputCls()} type="number" placeholder="30" {...register('age')} />
                </Field>
              </div>

              <Field label="Chief Complaint (optional)">
                <textarea className={`${inputCls()} resize-none`} rows={2}
                  placeholder="e.g. Fever, cough since 2 days..."
                  {...register('chiefComplaint')} />
              </Field>

              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mt-1">Select Doctor</p>
              <div className="grid grid-cols-1 gap-2">
                {clinic.doctors.map((doc) => (
                  <button key={doc.id} type="button" onClick={() => setSelectedDoctor(doc)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedDoctor?.id === doc.id
                        ? 'border-[#5A5FEF] bg-[#5A5FEF]/5'
                        : 'border-[#E6E8EC] hover:border-[#5A5FEF]/40'
                    }`}>
                    <div className="w-10 h-10 rounded-full bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-[#5A5FEF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1F2937] text-sm">{doc.name}</p>
                      <p className="text-xs text-[#9CA3AF]">{doc.specialization}</p>
                    </div>
                    {Number(doc.consultationFee) > 0 && (
                      <span className="text-xs font-medium text-[#5A5FEF]">₹{doc.consultationFee}</span>
                    )}
                    {selectedDoctor?.id === doc.id && (
                      <CheckCircle size={16} className="text-[#5A5FEF] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <button type="submit"
                className="w-full mt-2 bg-[#5A5FEF] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#4B50D1] transition-colors">
                Next: Pick Slot <ChevronRight size={16} />
              </button>
            </form>
          )}

          {/* ── Step 1: Date & Time ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Field label="Select Date">
                <input
                  type="date"
                  className={inputCls()}
                  value={selectedDate}
                  min={todayStr()}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                />
              </Field>

              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Available Time Slots</p>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button key={slot} type="button" onClick={() => setSelectedTime(slot)}
                    className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      selectedTime === slot
                        ? 'border-[#5A5FEF] bg-[#5A5FEF] text-white'
                        : 'border-[#E6E8EC] text-[#1F2937] hover:border-[#5A5FEF]/40'
                    }`}>
                    {slot}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(0)}
                  className="flex-1 py-3 rounded-xl border-2 border-[#E6E8EC] text-[#1F2937] font-semibold hover:bg-[#F5F6FA] transition-colors">
                  Back
                </button>
                <button onClick={onStep1Next}
                  className="flex-1 py-3 rounded-xl bg-[#5A5FEF] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#4B50D1] transition-colors">
                  Review <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Confirm ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#F5F6FA] rounded-xl border border-[#E6E8EC] p-4 space-y-3">
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Appointment Summary</p>
                <Row label="Name" value={`${getValues('firstName')} ${getValues('lastName')}`} />
                <Row label="Phone" value={getValues('phone')} />
                <Row label="Doctor" value={selectedDoctor?.name} />
                <Row label="Date" value={new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })} />
                <Row label="Time" value={selectedTime} />
                {getValues('chiefComplaint') && <Row label="Complaint" value={getValues('chiefComplaint')} />}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  ℹ️ If you've visited this clinic before, your existing record will be linked automatically.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border-2 border-[#E6E8EC] text-[#1F2937] font-semibold hover:bg-[#F5F6FA] transition-colors">
                  Back
                </button>
                <button onClick={onConfirm} disabled={bookMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-[#5A5FEF] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#4B50D1] transition-colors disabled:opacity-60">
                  {bookMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Booking…</> : 'Confirm Booking ✓'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">Powered by EMR Platform</p>
      </div>
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const inputCls = (err) =>
  `w-full px-3 py-2.5 rounded-xl border ${err ? 'border-red-400' : 'border-[#E6E8EC]'} bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#5A5FEF]/30 focus:border-[#5A5FEF] transition-colors`;

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[#1F2937]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#9CA3AF]">{label}</span>
      <span className="font-medium text-[#1F2937] text-right max-w-[60%]">{value}</span>
    </div>
  );
}
