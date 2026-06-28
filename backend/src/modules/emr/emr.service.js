import prisma from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS } from '../../utils/constants.js';

const SOAP_INCLUDE = {
  diagnoses: true,
  prescriptions: true,
  author: { select: { firstName: true, lastName: true } },
};

/**
 * Create or update the SOAP note for an appointment, including diagnoses
 * and prescriptions, atomically. One SOAP note per appointment.
 */
export const saveSoapNote = async (clinicId, userId, appointmentId, data, meta) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId, deletedAt: null },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  const note = await prisma.$transaction(async (tx) => {
    const existing = await tx.soapNote.findUnique({ where: { appointmentId } });

    const baseData = {
      subjective: data.subjective ?? null,
      objective: data.objective ?? null,
      assessment: data.assessment ?? null,
      plan: data.plan ?? null,
      followUpDays: data.followUpDays ?? null,
      followUpNotes: data.followUpNotes ?? null,
      isAiAssisted: data.isAiAssisted ?? false,
    };

    let soapNote;
    if (existing) {
      // Replace child collections to keep them in sync with the submitted payload
      await tx.diagnosis.deleteMany({ where: { soapNoteId: existing.id } });
      await tx.prescription.deleteMany({ where: { soapNoteId: existing.id } });
      soapNote = await tx.soapNote.update({ where: { id: existing.id }, data: baseData });
    } else {
      soapNote = await tx.soapNote.create({
        data: { appointmentId, authorId: userId, ...baseData },
      });
    }

    if (Array.isArray(data.diagnoses) && data.diagnoses.length) {
      await tx.diagnosis.createMany({
        data: data.diagnoses.map((d) => ({
          soapNoteId: soapNote.id,
          icdCode: d.icdCode ?? null,
          description: d.description,
          type: d.type ?? 'PRIMARY',
          notes: d.notes ?? null,
        })),
      });
    }

    if (Array.isArray(data.prescriptions) && data.prescriptions.length) {
      await tx.prescription.createMany({
        data: data.prescriptions.map((p) => ({
          soapNoteId: soapNote.id,
          medicineName: p.medicineName,
          genericName: p.genericName ?? null,
          dosage: p.dosage ?? null,
          frequency: p.frequency ?? null,
          duration: p.duration ?? null,
          route: p.route ?? null,
          instructions: p.instructions ?? null,
          quantity: p.quantity ?? null,
        })),
      });
    }

    return tx.soapNote.findUnique({ where: { id: soapNote.id }, include: SOAP_INCLUDE });
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.UPDATE, entity: 'SoapNote',
    entityId: note.id, newValues: { appointmentId }, ...meta,
  });

  return note;
};

export const getSoapNote = async (clinicId, appointmentId) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId, deletedAt: null },
    select: { id: true },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  return prisma.soapNote.findUnique({
    where: { appointmentId },
    include: SOAP_INCLUDE,
  });
};

/**
 * Full medical timeline for a patient: every completed/in-progress
 * encounter with diagnoses and prescriptions.
 */
export const getPatientTimeline = async (clinicId, patientId) => {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId, deletedAt: null },
    select: { id: true, uhid: true, firstName: true, lastName: true },
  });
  if (!patient) throw new AppError('Patient not found', 404);

  const encounters = await prisma.appointment.findMany({
    where: { patientId, clinicId, deletedAt: null },
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      chiefComplaint: true,
      doctor: { select: { firstName: true, lastName: true } },
      vitals: true,
      soapNote: { include: { diagnoses: true, prescriptions: true } },
      bill: { select: { id: true, billNumber: true, totalAmount: true, paymentStatus: true } },
    },
  });

  return { patient, encounters };
};
