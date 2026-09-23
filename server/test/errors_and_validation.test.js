import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/appError.js';
import { globalErrorHandler, notFoundHandler } from '../middlewares/error.middleware.js';

test('AppError sets correct defaults', () => {
  const err = new AppError('Something went wrong', 500, 'SERVER_ERROR');
  assert.equal(err.message, 'Something went wrong');
  assert.equal(err.statusCode, 500);
  assert.equal(err.code, 'SERVER_ERROR');
  assert.equal(err.isOperational, true);
});

test('BadRequestError and NotFoundError set expected status codes', () => {
  const badReq = new BadRequestError('Bad input', [{ field: 'email', message: 'invalid' }]);
  assert.equal(badReq.statusCode, 400);
  assert.equal(badReq.code, 'BAD_REQUEST');
  assert.equal(badReq.details.length, 1);

  const notFound = new NotFoundError('Movie not found');
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.code, 'NOT_FOUND');

  const unauth = new UnauthorizedError();
  assert.equal(unauth.statusCode, 401);

  const conflict = new ConflictError('Seat taken');
  assert.equal(conflict.statusCode, 409);
});

test('globalErrorHandler formats AppError response correctly', () => {
  let capturedStatus = null;
  let capturedJson = null;

  const mockRes = {
    status(s) {
      capturedStatus = s;
      return this;
    },
    json(data) {
      capturedJson = data;
      return this;
    },
  };

  const appErr = new BadRequestError('Invalid selection', [{ field: 'seat', message: 'occupied' }]);
  globalErrorHandler(appErr, {}, mockRes, () => {});

  assert.equal(capturedStatus, 400);
  assert.equal(capturedJson.success, false);
  assert.equal(capturedJson.message, 'Invalid selection');
  assert.equal(capturedJson.code, 'BAD_REQUEST');
  assert.deepEqual(capturedJson.errors, [{ field: 'seat', message: 'occupied' }]);
});

test('notFoundHandler passes 404 AppError to next', () => {
  let nextArg = null;
  const mockReq = { method: 'GET', originalUrl: '/api/non-existent' };
  notFoundHandler(mockReq, {}, (err) => {
    nextArg = err;
  });

  assert.ok(nextArg instanceof AppError);
  assert.equal(nextArg.statusCode, 404);
  assert.equal(nextArg.code, 'ROUTE_NOT_FOUND');
  assert.equal(nextArg.message, 'Cannot GET /api/non-existent');
});

test('ServiceUnavailableError sets 503 status and SERVICE_UNAVAILABLE code', async () => {
  const { ServiceUnavailableError } = await import('../errors/appError.js');
  const err = new ServiceUnavailableError('MCP service down');
  assert.equal(err.statusCode, 503);
  assert.equal(err.code, 'SERVICE_UNAVAILABLE');
  assert.equal(err.isOperational, true);
});

test('resetMcpClientCache clears cached client state safely', async () => {
  const { resetMcpClientCache } = await import('../services/chat/agent/mcpClient.js');
  assert.doesNotThrow(() => resetMcpClientCache());
});

