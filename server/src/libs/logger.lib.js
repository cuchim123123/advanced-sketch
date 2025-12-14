/**
 * Simple logger utility
 * Only logs in development or when DEBUG is enabled
 */

const isDev = process.env.NODE_ENV !== 'production';
const isDebug = process.env.DEBUG === 'true';

const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (...args) => {
    if (isDev || isDebug) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - always log
   */
  info: (...args) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warning logs - always log
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - always log
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Socket-related debug logs
   */
  socket: (...args) => {
    if (isDev || isDebug) {
      console.log('[SOCKET]', ...args);
    }
  },

  /**
   * Auto-save related logs
   */
  autoSave: (...args) => {
    if (isDev || isDebug) {
      console.log('[AUTO-SAVE]', ...args);
    }
  }
};

module.exports = logger;
