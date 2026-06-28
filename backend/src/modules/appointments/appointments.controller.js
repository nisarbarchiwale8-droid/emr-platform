import * as service from './appointments.service.js';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination, parseSort } from '../../utils/query.js';

const reqMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

export const create = async (req, res, next) => {
  try {
    const appt = await service.createAppointment(req.user.clinicId, req.user.id, req.body, reqMeta(req));
    return sendCreated(res, appt, 'Appointment booked successfully');
  } catch (err) { next(err); }
};

export const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orderBy = parseSort(req.query, ['scheduledAt', 'createdAt'], 'scheduledAt');
    const { appointments, total } = await service.listAppointments(req.user.clinicId, {
      date: req.query.date,
      doctorId: req.query.doctorId,
      patientId: req.query.patientId,
      status: req.query.status,
      skip, limit, orderBy,
    });
    return sendPaginated(res, appointments, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const appt = await service.getAppointmentById(req.user.clinicId, req.params.id);
    return sendSuccess(res, appt);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const appt = await service.updateAppointment(req.user.clinicId, req.user.id, req.params.id, req.body, reqMeta(req));
    return sendSuccess(res, appt, 'Appointment updated');
  } catch (err) { next(err); }
};

export const changeStatus = async (req, res, next) => {
  try {
    const appt = await service.updateStatus(req.user.clinicId, req.user.id, req.params.id, req.body.status, reqMeta(req));
    return sendSuccess(res, appt, 'Status updated');
  } catch (err) { next(err); }
};

export const cancel = async (req, res, next) => {
  try {
    const appt = await service.cancelAppointment(req.user.clinicId, req.user.id, req.params.id, reqMeta(req));
    return sendSuccess(res, appt, 'Appointment cancelled');
  } catch (err) { next(err); }
};

export const doctors = async (req, res, next) => {
  try {
    const list = await service.listDoctors(req.user.clinicId);
    return sendSuccess(res, list);
  } catch (err) { next(err); }
};
