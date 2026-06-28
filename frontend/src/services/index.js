import api from './api.js';

const buildQuery = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
};

export const patientService = {
  list: (params) => api.get(`/patients${buildQuery(params)}`),
  get: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  remove: (id) => api.delete(`/patients/${id}`),
};

export const appointmentService = {
  list: (params) => api.get(`/appointments${buildQuery(params)}`),
  get: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  changeStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
  doctors: () => api.get('/appointments/doctors'),
};

export const queueService = {
  get: (params) => api.get(`/queue${buildQuery(params)}`),
};

export const vitalsService = {
  get: (appointmentId) => api.get(`/vitals/${appointmentId}`),
  save: (appointmentId, data) => api.put(`/vitals/${appointmentId}`, data),
};

export const emrService = {
  getSoap: (appointmentId) => api.get(`/emr/soap/${appointmentId}`),
  saveSoap: (appointmentId, data) => api.put(`/emr/soap/${appointmentId}`, data),
  timeline: (patientId) => api.get(`/emr/timeline/${patientId}`),
};

export const billingService = {
  list: (params) => api.get(`/billing${buildQuery(params)}`),
  get: (id) => api.get(`/billing/${id}`),
  create: (data) => api.post('/billing', data),
  pay: (id, data) => api.post(`/billing/${id}/payments`, data),
  cancel: (id) => api.patch(`/billing/${id}/cancel`),
};

export const dashboardService = {
  stats: () => api.get('/dashboard/stats'),
  todayAppointments: () => api.get('/dashboard/today-appointments'),
};

export const reportService = {
  revenue: (params) => api.get(`/reports/revenue${buildQuery(params)}`),
  patients: (params) => api.get(`/reports/patients${buildQuery(params)}`),
  doctorPerformance: (params) => api.get(`/reports/doctor-performance${buildQuery(params)}`),
};

export const staffService = {
  list: (params) => api.get(`/staff${buildQuery(params)}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  resetPassword: (id, newPassword) => api.patch(`/staff/${id}/reset-password`, { newPassword }),
  deactivate: (id) => api.delete(`/staff/${id}`),
};

export const settingsService = {
  getClinic: () => api.get('/settings/clinic'),
  updateClinic: (data) => api.put('/settings/clinic', data),
  auditLogs: (params) => api.get(`/settings/audit-logs${buildQuery(params)}`),
};
