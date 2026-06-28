import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { billingService } from '../../services/index.js';
import { formatCurrency } from '../../utils/format.js';

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export function PaymentModal({ open, onClose, bill }) {
  const queryClient = useQueryClient();
  const due = Number(bill?.dueAmount || 0);

  const { register, handleSubmit, formState: { errors } } = useForm({
    values: { amount: due, method: 'CASH' },
  });

  const mutation = useMutation({
    mutationFn: (data) => billingService.pay(bill.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', bill.id] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Payment recorded');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const onSubmit = (data) => mutation.mutate({ ...data, amount: Number(data.amount) });

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>Record Payment</Button>
        </>
      }>
      <div className="flex flex-col gap-4">
        <div className="bg-bg-main rounded-[10px] p-3 flex justify-between">
          <span className="text-text-muted">Outstanding Due</span>
          <span className="font-semibold text-red-500">{formatCurrency(due)}</span>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Amount" type="number" step="0.01" required error={errors.amount?.message}
            {...register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Must be greater than 0' }, max: { value: due, message: 'Cannot exceed due amount' } })} />
          <Select label="Payment Method" options={METHODS} {...register('method')} />
          <Input label="Reference No. (optional)" {...register('referenceNo')} />
        </form>
      </div>
    </Modal>
  );
}
