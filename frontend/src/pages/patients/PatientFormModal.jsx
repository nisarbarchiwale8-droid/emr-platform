import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { patientService } from '../../services/index.js';
import { GENDER_LABELS, BLOOD_GROUP_LABELS } from '../../utils/constants.js';
import { toInputDate } from '../../utils/format.js';

const genderOptions = Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }));
const bloodOptions = Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => ({ value, label }));

export function PatientFormModal({ open, onClose, patient }) {
  const isEdit = Boolean(patient);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    values: patient
      ? { ...patient, dateOfBirth: toInputDate(patient.dateOfBirth) }
      : { gender: 'MALE', bloodGroup: 'UNKNOWN' },
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? patientService.update(patient.id, data) : patientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success(isEdit ? 'Patient updated' : 'Patient registered');
      reset();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save patient'),
  });

  const onSubmit = (data) => {
    const payload = { ...data };
    if (!payload.dateOfBirth) delete payload.dateOfBirth;
    if (!payload.age) delete payload.age; else payload.age = parseInt(payload.age, 10);
    mutation.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Patient' : 'Register New Patient'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Register Patient'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First Name" required error={errors.firstName?.message}
          {...register('firstName', { required: 'First name is required' })} />
        <Input label="Last Name" required error={errors.lastName?.message}
          {...register('lastName', { required: 'Last name is required' })} />
        <Input label="Phone" required error={errors.phone?.message}
          {...register('phone', { required: 'Phone is required', pattern: { value: /^[6-9]\d{9}$/, message: '10-digit mobile number' } })} />
        <Input label="Alternate Phone" error={errors.alternatePhone?.message}
          {...register('alternatePhone', { pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid phone' } })} />
        <Input label="Email" type="email" {...register('email')} />
        <Select label="Gender" required options={genderOptions} {...register('gender', { required: true })} />
        <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
        <Input label="Age" type="number" hint="Auto-calculated from DOB if provided" {...register('age')} />
        <Select label="Blood Group" options={bloodOptions} {...register('bloodGroup')} />
        <Input label="Pincode" error={errors.pincode?.message}
          {...register('pincode', { pattern: { value: /^\d{6}$/, message: 'Invalid pincode' } })} />
        <Input label="City" {...register('city')} />
        <Input label="Address" containerClassName="sm:col-span-2" {...register('address')} />
        <Input label="Emergency Contact Name" {...register('emergencyName')} />
        <Input label="Emergency Contact Phone" error={errors.emergencyPhone?.message}
          {...register('emergencyPhone', { pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid phone' } })} />
      </form>
    </Modal>
  );
}
