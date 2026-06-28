/**
 * Sequential, human-readable identifier generators.
 * These run inside transactions to guarantee uniqueness per clinic.
 */

const pad = (num, size) => String(num).padStart(size, '0');

/**
 * Generate the next UHID for a clinic.
 * Format: UH-000001 (per clinic)
 */
export const buildUhid = (sequence) => `UH${pad(sequence, 6)}`;

/**
 * Generate the next bill number for a clinic.
 * Format: INV-YYYYMM-0001
 */
export const buildBillNumber = (sequence, date = new Date()) => {
  const yyyymm = `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}`;
  return `INV-${yyyymm}-${pad(sequence, 4)}`;
};

/**
 * Compute age in years from a date of birth.
 */
export const computeAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

/**
 * Compute BMI from weight (kg) and height (cm).
 */
export const computeBmi = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
};
