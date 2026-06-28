import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { patientService, billingService } from '../../services/index.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { fullName, formatCurrency } from '../../utils/format.js';

const CATEGORIES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'OTHER', label: 'Other' },
];

export function BillFormModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const debounced = useDebounce(patientSearch, 350);

  const { register, control, handleSubmit, watch, reset } = useForm({
    defaultValues: { lineItems: [{ description: 'Consultation', category: 'CONSULTATION', quantity: 1, unitPrice: '' }], discountPercent: 0, taxPercent: 0 },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const watched = watch();

  const { data: patientResults } = useQuery({
    queryKey: ['bill-patient-search', debounced],
    queryFn: () => patientService.list({ search: debounced, limit: 8 }).then((r) => r.data.data),
    enabled: debounced.length >= 2 && !selectedPatient,
  });

  const totals = useMemo(() => {
    const subtotal = (watched.lineItems || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
    const discount = (subtotal * (Number(watched.discountPercent) || 0)) / 100;
    const taxable = Math.max(subtotal - discount, 0);
    const tax = (taxable * (Number(watched.taxPercent) || 0)) / 100;
    return { subtotal, discount, tax, total: taxable + tax };
  }, [watched]);

  const mutation = useMutation({
    mutationFn: (data) => billingService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill created');
      handleClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create bill'),
  });

  const handleClose = () => { reset(); setSelectedPatient(null); setPatientSearch(''); onClose(); };

  const onSubmit = (data) => {
    if (!selectedPatient) return toast.error('Please select a patient');
    mutation.mutate({
      patientId: selectedPatient.id,
      lineItems: data.lineItems.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      discountPercent: Number(data.discountPercent) || 0,
      taxPercent: Number(data.taxPercent) || 0,
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Bill" size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>Create Bill — {formatCurrency(totals.total)}</Button>
        </>
      }>
      <div className="flex flex-col gap-4">
        {/* Patient */}
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
            <Input label="Patient" required placeholder="Search patient..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
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

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-small font-medium text-text-main">Line Items</label>
            <Button type="button" size="sm" variant="secondary" onClick={() => append({ description: '', category: 'OTHER', quantity: 1, unitPrice: '' })}>
              <Plus size={14} /> Add Item
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <Input containerClassName="col-span-4" placeholder="Description" {...register(`lineItems.${i}.description`)} />
                <Select containerClassName="col-span-3" options={CATEGORIES} {...register(`lineItems.${i}.category`)} />
                <Input containerClassName="col-span-2" type="number" placeholder="Qty" {...register(`lineItems.${i}.quantity`)} />
                <Input containerClassName="col-span-2" type="number" step="0.01" placeholder="Price" {...register(`lineItems.${i}.unitPrice`)} />
                <button type="button" onClick={() => remove(i)} className="col-span-1 p-2.5 text-text-muted hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Discount / tax + totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex gap-2">
            <Input label="Discount (%)" type="number" step="0.01" {...register('discountPercent')} />
            <Input label="GST (%)" type="number" step="0.01" {...register('taxPercent')} />
          </div>
          <div className="bg-bg-main rounded-[10px] p-4 flex flex-col gap-1">
            <div className="flex justify-between text-body"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-body"><span className="text-text-muted">Discount</span><span>− {formatCurrency(totals.discount)}</span></div>
            <div className="flex justify-between text-body"><span className="text-text-muted">GST</span><span>{formatCurrency(totals.tax)}</span></div>
            <div className="flex justify-between text-h2 font-semibold pt-2 border-t border-border mt-1"><span>Total</span><span className="text-primary">{formatCurrency(totals.total)}</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
