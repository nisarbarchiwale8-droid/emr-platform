import * as service from './patients.service.js';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination, parseSort } from '../../utils/query.js';

const reqMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const SORT_FIELDS = ['firstName', 'lastName', 'createdAt', 'uhid'];

export const create = async (req, res, next) => {
  try {
    const patient = await service.createPatient(req.user.clinicId, req.user.id, req.body, reqMeta(req));
    return sendCreated(res, patient, 'Patient registered successfully');
  } catch (err) { next(err); }
};

export const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orderBy = parseSort(req.query, SORT_FIELDS, 'createdAt');
    const { patients, total } = await service.listPatients(req.user.clinicId, {
      search: req.query.search?.trim(),
      skip, limit, orderBy,
    });
    return sendPaginated(res, patients, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const patient = await service.getPatientById(req.user.clinicId, req.params.id);
    return sendSuccess(res, patient);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const patient = await service.updatePatient(req.user.clinicId, req.user.id, req.params.id, req.body, reqMeta(req));
    return sendSuccess(res, patient, 'Patient updated successfully');
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    await service.deletePatient(req.user.clinicId, req.user.id, req.params.id, reqMeta(req));
    return sendSuccess(res, null, 'Patient deleted successfully');
  } catch (err) { next(err); }
};
