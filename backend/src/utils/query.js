import { PAGINATION } from './constants.js';

/**
 * Parse pagination params from request query.
 * Clamps limit to MAX_LIMIT and guards against invalid input.
 */
export const parsePagination = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = PAGINATION.DEFAULT_PAGE;
  if (!Number.isInteger(limit) || limit < 1) limit = PAGINATION.DEFAULT_LIMIT;
  if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Build a Prisma orderBy object from sort params.
 * sort=field, order=asc|desc
 */
export const parseSort = (query, allowedFields, defaultField = 'createdAt') => {
  const field = allowedFields.includes(query.sort) ? query.sort : defaultField;
  const order = query.order === 'asc' ? 'asc' : 'desc';
  return { [field]: order };
};
