import type { NextFunction, Request, Response } from 'express';
import config from '../config';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  /** Multer error codes: LIMIT_FILE_SIZE etc. (name === 'MulterError'). */
  code?: string;
}

/**
 * The single error path. Express 5 forwards rejected promises from async
 * handlers here automatically; multer calls next(err) with its own errors;
 * HttpErrors thrown anywhere carry their statusCode.
 *
 * Express-4 per-route `try { … } catch { res.status(500) }` boilerplate was
 * removed in favour of this handler (#27).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const error = (err ?? {}) as AppError;

  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Multer errors (bad file size, unexpected field, …) are client-intent
  // failures without a statusCode — never let them surface as 500.
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'File too large';
    } else {
      statusCode = error.statusCode || 400;
      message = message || 'Invalid upload';
    }
  }

  if (config.nodeEnv === 'development') {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      statusCode,
    });
  } else {
    console.error('Error:', { statusCode, message });
  }

  if (res.headersSent) {
    // Nothing sane left to send mid-response (e.g. an SSE stream broke);
    // destroying the connection beats double-response crashes.
    res.end();
    return;
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(config.nodeEnv === 'development' && { stack: error.stack }),
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.path}`,
      statusCode: 404,
    },
  });
}

export function createError(message: string, statusCode: number): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}
