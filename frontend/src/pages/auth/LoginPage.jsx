import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Stethoscope, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { authService } from '../../services/auth.service.js';
import { useAuthStore } from '../../store/auth.store.js';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await authService.login(data);
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-primary flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-8">
            <Stethoscope size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">EMR Platform</h1>
          <p className="text-white/80 text-base leading-relaxed">
            Modern clinic management software designed for small clinics in India. Simple, fast, and paperless.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Clinics', value: '500+' },
              { label: 'Patients', value: '1L+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-[16px] p-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-white/70 text-small mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Stethoscope size={20} className="text-white" />
            </div>
            <span className="text-h2 font-bold text-text-main">EMR Platform</span>
          </div>

          <h2 className="text-h1 font-bold text-text-main">Welcome back</h2>
          <p className="text-body text-text-muted mt-2 mb-8">Sign in to your clinic account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@clinic.com"
              required
              icon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
              })}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                icon={<Lock size={16} />}
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="mt-1 text-small text-text-muted hover:text-primary transition-colors flex items-center gap-1"
              >
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                {showPassword ? 'Hide' : 'Show'} password
              </button>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full mt-2"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          {/* Register CTA */}
          <div className="mt-6 text-center">
            <p className="text-small text-text-muted">
              New clinic?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Register &amp; Subscribe →
              </Link>
            </p>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-4 p-4 rounded-[10px] bg-indigo-50 border border-indigo-100">
            <p className="text-small font-medium text-primary mb-2">Demo Credentials</p>
            <div className="space-y-1 text-small text-text-muted">
              <p>Admin: <span className="text-text-main font-medium">admin@demo.com</span></p>
              <p>Doctor: <span className="text-text-main font-medium">doctor@demo.com</span></p>
              <p>Staff: <span className="text-text-main font-medium">receptionist@demo.com</span></p>
              <p className="mt-1">Password: <span className="text-text-main font-medium">Admin@1234 / Doctor@1234 / Staff@1234</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
