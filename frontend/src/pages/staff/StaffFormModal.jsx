import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { staffService } from '../../services/index.js';
import { ROLE_LABELS } from '../../utils/constants.js';

const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export function StaffFormModal({ open, onClose, staff }) {
  const isEdit = Boolean(staff);
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    values: staff
      ? { ...staff, ...staff.doctorProfile }
      : { role: 'RECEPTIONIST' },
  });
  const role = watch('role');

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? staffService.update(staff.id, data) : staffService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(isEdit ? 'Staff updated' : 'Staff member created');
      reset();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const onSubmit = (data) => {
    const payload = { ...data };
    if (payload.consultationFee) payload.consultationFee = Number(payload.consultationFee);
    if (payload.followUpFee) payload.followUpFee = Number(payload.followUpFee);
    mutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Staff Member' : 'Add Staff Member'} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>{isEdit ? 'Save Changes' : 'Create'}</Button>
        </>
      }>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First Name" required error={errors.firstName?.message} {...register('firstName', { required: 'Required' })} />
        <Input label="Last Name" required error={errors.lastName?.message} {...register('lastName', { required: 'Required' })} />
        <Input label="Email" type="email" required disabled={isEdit} error={errors.email?.message}
          {...register('email', { required: 'Required' })} />
        <Input label="Phone" error={errors.phone?.message}
          {...register('phone', { pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid phone' } })} />
        {!isEdit && (
          <Input label="Password" type="password" required containerClassName="sm:col-span-2" error={errors.password?.message}
            hint="Min 8 chars with uppercase, lowercase, and a number"
            {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
        )}
        <Select label="Role" required disabled={isEdit} options={roleOptions} {...register('role', { required: true })} />
        {isEdit && (
          <Select label="Status" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'SUSPENDED', label: 'Suspended' }]} {...register('status')} />
        )}

        {role === 'DOCTOR' && (
          <>
            <Input label="Specialization" {...register('specialization')} />
            <Input label="Qualification" {...register('qualification')} />
            <Input label="Registration No." {...register('registrationNo')} />
            <Input label="Consultation Fee (₹)" type="number" step="0.01" {...register('consultationFee')} />
            <Input label="Follow-up Fee (₹)" type="number" step="0.01" {...register('followUpFee')} />
          </>
        )}
      </form>
    </Modal>
  );
}
