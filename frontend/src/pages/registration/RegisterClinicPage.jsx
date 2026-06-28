import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Stethoscope, Check, ArrowLeft, ArrowRight, Building2, CreditCard, UserCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import api from '../../services/api.js';

const STEPS = ['Clinic Details', 'Choose Plan', 'Payment'];

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ current }) {
  const icons = [Building2, CreditCard, UserCheck];
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const Icon = icons[i];
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${active ? 'text-primary' : done ? 'text-accent-green' : 'text-text-muted'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 transition-all ${
                done ? 'bg-accent-green border-accent-green text-white'
                  : active ? 'bg-primary border-primary text-white'
                  : 'bg-bg-main border-border text-text-muted'
              }`}>
                {done ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <span className={`hidden sm:block text-xs font-medium ${active ? 'text-primary' : done ? 'text-accent-green' : 'text-text-muted'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${done ? 'bg-accent-green' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, selected, onSelect }) {
  const isPopular = plan.slug === 'growth';
  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={`w-full text-left rounded-[16px] border-2 p-5 transition-all relative ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-bg-card hover:border-primary/40'
      }`}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-0.5 rounded-full">
          Most Popular
        </span>
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-text-main text-base">{plan.name}</p>
          <p className="text-xs text-text-muted mt-0.5">{plan.description}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
          selected ? 'border-primary bg-primary' : 'border-border'
        }`}>
          {selected && <Check size={12} className="text-white" />}
        </div>
      </div>
      <p className="text-2xl font-bold text-text-main">
        ₹{Number(plan.price).toLocaleString('en-IN')}
        <span className="text-sm font-normal text-text-muted">/mo</span>
      </p>
      <ul className="mt-3 space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-text-muted">
            <Check size={12} className="text-accent-green flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs text-text-muted">
        <span>👨‍⚕️ Up to {plan.maxDoctors} doctor{plan.maxDoctors > 1 ? 's' : ''}</span>
        <span>👥 {plan.maxPatients.toLocaleString('en-IN')} patients</span>
      </div>
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function RegisterClinicPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.get('/registration/plans').then((r) => r.data.data),
  });

  const plans = plansData || [];

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const onStep1Submit = (data) => {
    setFormData(data);
    setStep(1);
  };

  const onStep2Next = () => {
    if (!selectedPlan) { toast.error('Please select a plan'); return; }
    setStep(2);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Create Razorpay order
      const orderRes = await api.post('/registration/create-order', {
        planId: selectedPlan.id,
        clinicName: formData.clinicName,
        adminEmail: formData.adminEmail,
      });
      const { orderId, amount, currency, keyId } = orderRes.data.data;

      // Dev mode — skip Razorpay UI if test keys not configured
      if (!keyId || keyId.includes('XXXX')) {
        await completeDemoPayment(orderId);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'EMR Platform',
        description: `${selectedPlan.name} Plan Subscription`,
        order_id: orderId,
        prefill: {
          name: `${formData.adminFirstName} ${formData.adminLastName}`,
          email: formData.adminEmail,
          contact: formData.adminPhone,
        },
        theme: { color: '#5A5FEF' },
        handler: async (response) => {
          await verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  const completeDemoPayment = async (orderId) => {
    await verifyPayment({
      razorpayOrderId: orderId,
      razorpayPaymentId: `dev_pay_${Date.now()}`,
      razorpaySignature: `dev_sig_${Date.now()}`,
    });
  };

  const verifyPayment = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    try {
      await api.post('/registration/verify-payment', {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        planId: selectedPlan.id,
        clinicName: formData.clinicName,
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName,
        adminEmail: formData.adminEmail,
        adminPhone: formData.adminPhone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        gstin: formData.gstin,
      });
      toast.success('Clinic registered! Check your email for login credentials.');
      navigate('/register/success', {
        state: { email: formData.adminEmail, clinicName: formData.clinicName, planName: selectedPlan.name },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-gradient-primary flex-col items-center justify-center p-12 text-white">
        <div className="max-w-xs text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-8">
            <Stethoscope size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Start Your Free Clinic</h1>
          <p className="text-white/80 text-base leading-relaxed">
            Set up your paperless clinic in minutes. No IT team required.
          </p>
          <div className="mt-10 space-y-4 text-left">
            {[
              'Complete EMR & SOAP notes',
              'Patient queue management',
              'Billing & prescriptions',
              'Secure & HIPAA-ready',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={14} />
                </div>
                <span className="text-white/90 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="lg:hidden w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-h1 font-bold text-text-main">Register Your Clinic</h2>
              <p className="text-small text-text-muted">Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>

          <StepBar current={step} />

          {/* ── Step 0: Clinic Details ── */}
          {step === 0 && (
            <form onSubmit={handleSubmit(onStep1Submit)} className="flex flex-col gap-4">
              <p className="text-small font-semibold text-text-muted uppercase tracking-wider">Clinic Information</p>
              <Input
                label="Clinic Name"
                placeholder="e.g. Sharma Clinic"
                required
                error={errors.clinicName?.message}
                {...register('clinicName', { required: 'Clinic name is required' })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" placeholder="Mumbai" {...register('city')} />
                <Input label="State" placeholder="Maharashtra" {...register('state')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Pincode" placeholder="400001" {...register('pincode')} />
                <Input label="GSTIN (optional)" placeholder="27AAAA..." {...register('gstin')} />
              </div>
              <Input label="Address" placeholder="123 Main Street" {...register('address')} />

              <p className="text-small font-semibold text-text-muted uppercase tracking-wider mt-2">Admin Account</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  required
                  error={errors.adminFirstName?.message}
                  {...register('adminFirstName', { required: 'Required' })}
                />
                <Input
                  label="Last Name"
                  required
                  error={errors.adminLastName?.message}
                  {...register('adminLastName', { required: 'Required' })}
                />
              </div>
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="you@clinic.com"
                error={errors.adminEmail?.message}
                {...register('adminEmail', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
                })}
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="9999999999"
                error={errors.adminPhone?.message}
                {...register('adminPhone', {
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile number' },
                })}
              />

              <Button type="submit" className="w-full mt-2">
                Next: Choose Plan <ArrowRight size={16} />
              </Button>

              <p className="text-center text-small text-text-muted">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── Step 1: Choose Plan ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              {plansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {plans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        selected={selectedPlan?.id === plan.id}
                        onSelect={setSelectedPlan}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">
                      <ArrowLeft size={16} /> Back
                    </Button>
                    <Button onClick={onStep2Next} className="flex-1">
                      Continue to Payment <ArrowRight size={16} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Payment ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              {/* Order summary */}
              <div className="rounded-[16px] border border-border bg-bg-card p-5">
                <p className="text-small font-semibold text-text-muted uppercase tracking-wider mb-4">Order Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-body">
                    <span className="text-text-muted">Clinic</span>
                    <span className="font-medium text-text-main">{formData.clinicName}</span>
                  </div>
                  <div className="flex justify-between text-body">
                    <span className="text-text-muted">Plan</span>
                    <span className="font-medium text-text-main">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex justify-between text-body">
                    <span className="text-text-muted">Billing</span>
                    <span className="font-medium text-text-main">Monthly</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between text-base font-bold text-text-main">
                    <span>Total</span>
                    <span>₹{Number(selectedPlan?.price).toLocaleString('en-IN')}/mo</span>
                  </div>
                </div>
              </div>

              {/* Admin info summary */}
              <div className="rounded-[16px] border border-border bg-bg-card p-5">
                <p className="text-small font-semibold text-text-muted uppercase tracking-wider mb-3">Admin Account</p>
                <p className="text-body text-text-main font-medium">{formData.adminFirstName} {formData.adminLastName}</p>
                <p className="text-small text-text-muted">{formData.adminEmail}</p>
              </div>

              <div className="rounded-[10px] bg-blue-50 border border-blue-100 p-4">
                <p className="text-small text-blue-700">
                  🔐 After payment, login credentials will be sent to <strong>{formData.adminEmail}</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} disabled={isProcessing}>
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button className="flex-1" onClick={handlePayment} loading={isProcessing}>
                  {isProcessing ? 'Processing…' : `Pay ₹${Number(selectedPlan?.price).toLocaleString('en-IN')} & Register`}
                </Button>
              </div>

              <p className="text-center text-xs text-text-muted">
                Payments secured by Razorpay · Supports UPI, Cards, Net Banking
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
