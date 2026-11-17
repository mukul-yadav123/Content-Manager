/**
 * Reusable Pagination Helper Utility
 * Normalizes query pagination parameters and generates response metadata
 */
export const getPaginationOptions = (query = {}, defaultLimit = 10, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const skip = (page - 1) * limit;

  // Sorting
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  return {
    page,
    limit,
    skip,
    sort
  };
};

/**
 * Format paginated response data envelope
 */
export const formatPaginatedResponse = ({ items, total, page, limit }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    items,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

export default {
  getPaginationOptions,
  formatPaginatedResponse
};

