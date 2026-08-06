/* ==========================================================================
   KrishiMitra AI — Global Error Handler Middleware
   ========================================================================== */

'use strict';

const { logger } = require('./logger');

/**
 * Express global error handler.
 * Must have 4 parameters for Express to treat it as an error handler.
 *
 * @param {Error}   err
 * @param {Object}  req
 * @param {Object}  res
 * @param {Function} next
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
    message:    err.message,
    stack:      process.env.NODE_ENV === 'development' ? err.stack : undefined,
    status
  });

  res.status(status).json({
    success: false,
    error:   err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler };
