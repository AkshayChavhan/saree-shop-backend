import { Request, Response, NextFunction } from 'express';
import { requireMasterKey, optionalMasterKey } from '../masterKey.middleware';

describe('Master API Key Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    // Setup mock request
    mockRequest = {
      headers: {}
    };

    // Setup mock response
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    mockResponse = {
      status: statusSpy,
      json: jsonSpy
    };

    // Setup next function
    nextFunction = jest.fn();

    // Clear console warnings
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requireMasterKey', () => {
    describe('when MASTER_API_KEY is not configured', () => {
      beforeEach(() => {
        delete process.env.MASTER_API_KEY;
        delete process.env.BYPASS_MASTER_KEY;
      });

      it('should return 500 error', async () => {
        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Server configuration error',
            code: 'MASTER_KEY_NOT_CONFIGURED'
          }
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('when bypass is enabled in development', () => {
      beforeEach(() => {
        process.env.BYPASS_MASTER_KEY = 'true';
        process.env.NODE_ENV = 'development';
      });

      it('should bypass master key check and call next', async () => {
        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(statusSpy).not.toHaveBeenCalled();
      });

      it('should log warning when bypassed', async () => {
        const warnSpy = jest.spyOn(console, 'warn');

        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(warnSpy).toHaveBeenCalledWith(
          '⚠️  Master API key check bypassed (development mode)'
        );
      });
    });

    describe('when bypass is enabled but not in development', () => {
      beforeEach(() => {
        process.env.MASTER_API_KEY = 'test-master-key';
        process.env.BYPASS_MASTER_KEY = 'true';
        process.env.NODE_ENV = 'production';
      });

      it('should not bypass and require master key', async () => {
        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Master API key is required. Include X-API-Key header with your request.',
            code: 'MASTER_KEY_MISSING'
          }
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('when master key is missing from headers', () => {
      beforeEach(() => {
        process.env.MASTER_API_KEY = 'test-master-key';
        delete process.env.BYPASS_MASTER_KEY;
      });

      it('should return 401 error with MASTER_KEY_MISSING code', async () => {
        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Master API key is required. Include X-API-Key header with your request.',
            code: 'MASTER_KEY_MISSING'
          }
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('when master key is invalid', () => {
      beforeEach(() => {
        process.env.MASTER_API_KEY = 'correct-master-key';
        mockRequest.headers = {
          'x-api-key': 'wrong-master-key'
        };
      });

      it('should return 401 error with MASTER_KEY_INVALID code', async () => {
        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Invalid master API key. Access denied.',
            code: 'MASTER_KEY_INVALID'
          }
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('when master key is valid', () => {
      beforeEach(() => {
        process.env.MASTER_API_KEY = 'valid-master-key';
      });

      it('should call next with lowercase header', async () => {
        mockRequest.headers = {
          'x-api-key': 'valid-master-key'
        };

        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(statusSpy).not.toHaveBeenCalled();
      });

      it('should call next with uppercase header', async () => {
        mockRequest.headers = {
          'X-API-Key': 'valid-master-key'
        };

        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(statusSpy).not.toHaveBeenCalled();
      });
    });

    describe('when error occurs in middleware', () => {
      beforeEach(() => {
        process.env.MASTER_API_KEY = 'test-key';
        // Simulate error by making headers throw
        Object.defineProperty(mockRequest, 'headers', {
          get() {
            throw new Error('Unexpected error');
          }
        });
      });

      it('should return 500 error', async () => {
        await requireMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Master API key validation failed',
            code: 'MASTER_KEY_ERROR'
          }
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });
  });

  describe('optionalMasterKey', () => {
    beforeEach(() => {
      process.env.MASTER_API_KEY = 'test-master-key';
    });

    describe('when no API key is provided', () => {
      it('should call next without validation', async () => {
        await optionalMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(statusSpy).not.toHaveBeenCalled();
      });
    });

    describe('when valid API key is provided', () => {
      beforeEach(() => {
        mockRequest.headers = {
          'x-api-key': 'test-master-key'
        };
      });

      it('should call next after validation', async () => {
        await optionalMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(statusSpy).not.toHaveBeenCalled();
      });
    });

    describe('when invalid API key is provided', () => {
      beforeEach(() => {
        mockRequest.headers = {
          'x-api-key': 'invalid-key'
        };
      });

      it('should return 401 error', async () => {
        await optionalMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            message: 'Invalid master API key',
            code: 'MASTER_KEY_INVALID'
          }
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('when error occurs', () => {
      beforeEach(() => {
        Object.defineProperty(mockRequest, 'headers', {
          get() {
            throw new Error('Unexpected error');
          }
        });
      });

      it('should call next (silent fail)', async () => {
        await optionalMasterKey(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(statusSpy).not.toHaveBeenCalled();
      });
    });
  });
});
