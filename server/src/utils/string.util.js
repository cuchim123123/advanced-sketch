/**
 * String Utilities
 * Common string manipulation functions
 */

/**
 * Normalize email (lowercase + trim)
 */
const normalizeEmail = (email) => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Normalize username (trim only, preserve case for display)
 */
const normalizeUsername = (username) => {
  if (!username) return '';
  return username.trim();
};

/**
 * Create case-insensitive regex for exact match
 */
const caseInsensitiveRegex = (str) => {
  if (!str) return null;
  // Escape special regex characters
  const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
};

/**
 * Escape string for use in regex
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize string for safe usage
 */
const sanitize = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

module.exports = {
  normalizeEmail,
  normalizeUsername,
  caseInsensitiveRegex,
  escapeRegex,
  sanitize
};
