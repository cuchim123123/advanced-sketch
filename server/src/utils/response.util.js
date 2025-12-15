/**
 * Response Helpers
 * Standardized API response format
 * Returns plain objects for use with res.json()
 */

/**
 * Success response object
 */
const success = (data = null, message = null) => {
  const response = { success: true };
  
  if (message) response.message = message;
  if (data !== null) response.data = data;
  
  return response;
};

/**
 * Created response object (for 201)
 */
const created = (data = null, message = 'Created successfully') => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Paginated response object
 */
const paginated = (data, pagination) => {
  return {
    success: true,
    data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      totalItems: pagination.total,
      itemsPerPage: pagination.limit
    }
  };
};

module.exports = {
  success,
  created,
  paginated
};
