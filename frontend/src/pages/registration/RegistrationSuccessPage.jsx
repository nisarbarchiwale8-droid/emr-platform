import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';

export default function RegistrationSuccessPage() {
  const { state } = useLocation();
  const { email, clinicName, planName } = state || {};

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={44} className="text-accent-green" />
        </div>

        <h1 className="text-h1 font-bold text-text-main mb-2">You're all set!</h1>
        <p className="text-body text-text-muted mb-8">
          {clinicName ? `${clinicName} has been registered` : 'Your clinic has been registered'} on the{' '}
          {planName && <strong className="text-text-main">{planName}</strong>} plan.
        </p>

        <div className="bg-bg-card rounded-[16px] border border-border p-6 mb-6 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-text-main">Check your inbox</p>
              <p className="text-small text-text-muted mt-1">
                We've sent your login credentials to{' '}
                <strong className="text-text-main">{email || 'your email'}</strong>.
                The email contains your temporary password — change it after your first login.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link to="/login">
            <Button className="w-full">
              Go to Login <ArrowRight size={16} />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-text-muted mt-6">
          Didn't receive the email? Check your spam folder or contact support.
        </p>
      </div>
    </div>
  );
}
