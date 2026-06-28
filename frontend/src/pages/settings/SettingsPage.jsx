import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { Building2, ScrollText, QrCode, Download, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { settingsService } from '../../services/index.js';
import { formatDateTime, fullName } from '../../utils/format.js';

// ─── Clinic Settings ──────────────────────────────────────────────────────────

function ClinicSettings() {
  const queryClient = useQueryClient();
  const { data: clinic } = useQuery({
    queryKey: ['clinic'],
    queryFn: () => settingsService.getClinic().then((r) => r.data.data),
  });
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => { if (clinic) reset(clinic); }, [clinic, reset]);

  const mutation = useMutation({
    mutationFn: (data) => settingsService.updateClinic(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clinic'] }); toast.success('Clinic settings saved'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  return (
    <Card>
      <CardHeader><CardTitle><span className="flex items-center gap-2"><Building2 size={18} /> Clinic Profile</span></CardTitle></CardHeader>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Clinic Name" required {...register('name')} />
        <Input label="Phone" {...register('phone')} />
        <Input label="Email" type="email" {...register('email')} />
        <Input label="GSTIN" {...register('gstin')} />
        <Input label="Address" containerClassName="sm:col-span-2" {...register('address')} />
        <Input label="City" {...register('city')} />
        <Input label="State" {...register('state')} />
        <Input label="Pincode" {...register('pincode')} />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={mutation.isPending}>Save Settings</Button>
        </div>
      </form>
    </Card>
  );
}

// ─── QR Code Tab ──────────────────────────────────────────────────────────────

function QRCodeTab() {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const { data: clinic } = useQuery({
    queryKey: ['clinic'],
    queryFn: () => settingsService.getClinic().then((r) => r.data.data),
  });

  const bookingUrl = clinic
    ? `${window.location.origin}/book/${clinic.code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const size = 600;
    canvas.width = size;
    canvas.height = size + 80;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 40, 20, size - 80, size - 80);
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 22px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(clinic?.name || 'Clinic', size / 2, size - 20);
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '16px Inter, Arial, sans-serif';
      ctx.fillText('Scan to book appointment', size / 2, size + 10);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = `${clinic?.code || 'clinic'}-booking-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* QR Card */}
      <Card className="flex flex-col items-center text-center gap-5 py-8">
        <div>
          <h3 className="text-h2 font-semibold text-text-main">Patient Booking QR</h3>
          <p className="text-small text-text-muted mt-1">
            Print this and display at your reception. Patients scan to self-book.
          </p>
        </div>

        {clinic ? (
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-2xl border-2 border-primary/20 shadow-sm"
          >
            <QRCodeSVG
              value={bookingUrl}
              size={220}
              level="H"
              includeMargin={false}
              fgColor="#1F2937"
              bgColor="#ffffff"
              imageSettings={{
                src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM1QTVGRUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjIgMTJoLTRsLTMgOUw5IDNMN"',
                height: 36,
                width: 36,
                excavate: true,
              }}
            />
          </div>
        ) : (
          <div className="w-56 h-56 bg-bg-main rounded-2xl border border-border animate-pulse" />
        )}

        <div className="flex gap-2 w-full max-w-xs">
          <Button variant="secondary" className="flex-1" onClick={copyLink}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button className="flex-1" onClick={downloadQR}>
            <Download size={14} /> Download
          </Button>
        </div>

        <p className="text-xs text-text-muted">Clinic code: <span className="font-mono font-semibold text-primary">{clinic?.code}</span></p>
      </Card>

      {/* Info Card */}
      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="text-h2 font-semibold text-text-main mb-3">Booking URL</h3>
          <div className="flex items-center gap-2 p-3 bg-bg-main rounded-xl border border-border">
            <p className="text-small text-primary font-mono flex-1 truncate">{bookingUrl}</p>
            <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-border transition-colors text-text-muted hover:text-primary">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-small text-text-muted mt-2">
            Share this link via WhatsApp, website, or social media so patients can book online.
          </p>
        </Card>

        <Card>
          <h3 className="text-h2 font-semibold text-text-main mb-3">How it works</h3>
          <div className="space-y-3">
            {[
              { icon: '📱', title: 'Patient scans QR', desc: 'Opens the booking page directly — no app download needed.' },
              { icon: '📝', title: 'Fills details', desc: 'Name, phone, selects doctor and preferred time slot.' },
              { icon: '🎫', title: 'Gets token number', desc: 'Instantly sees token number and appointment confirmation.' },
              { icon: '🏥', title: 'Appears in queue', desc: 'Appointment shows up in your Queue page automatically.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-small font-semibold text-text-main">{item.title}</p>
                  <p className="text-small text-text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

const ACTION_VARIANT = { CREATE: 'success', UPDATE: 'default', DELETE: 'danger', LOGIN: 'muted', LOGOUT: 'muted' };

function AuditLogs() {
  const { data } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => settingsService.auditLogs({ limit: 20 }).then((r) => r.data),
  });

  const columns = [
    { key: 'time', header: 'Time', render: (r) => formatDateTime(r.createdAt) },
    { key: 'user', header: 'User', render: (r) => r.user ? fullName(r.user) : 'System' },
    { key: 'action', header: 'Action', render: (r) => <Badge variant={ACTION_VARIANT[r.action] || 'muted'}>{r.action}</Badge> },
    { key: 'entity', header: 'Entity', render: (r) => r.entity },
  ];

  return (
    <Card>
      <CardHeader><CardTitle><span className="flex items-center gap-2"><ScrollText size={18} /> Audit Logs</span></CardTitle></CardHeader>
      <Table columns={columns} data={data?.data} emptyMessage="No audit logs yet." />
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'clinic', label: 'Clinic Profile', icon: Building2 },
  { id: 'qr', label: 'QR Booking', icon: QrCode },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('clinic');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-body font-medium transition-colors ${
                tab === t.id ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-main hover:bg-bg-main'
              }`}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'clinic' && <ClinicSettings />}
      {tab === 'qr' && <QRCodeTab />}
      {tab === 'audit' && <AuditLogs />}
    </div>
  );
}
