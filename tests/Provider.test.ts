import { FlagshipContext } from './../src/types';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { ABTastyProvider } from '../src/Provider';
import { ClientProviderStatus, OpenFeatureEventEmitter, ProviderEvents } from '@openfeature/web-sdk';
import Flagship, { FSSdkStatus, Visitor } from '@flagship.io/js-sdk';


vi.mock('@flagship.io/js-sdk', () => {
  const mockVisitor = {
    visitorId: 'test-visitor',
    hasConsented: true,
    flagsStatus: { status: 'FETCHED' },
    getFlag: vi.fn(),
    fetchFlags: vi.fn().mockResolvedValue(undefined),
    updateContext: vi.fn(),
    setConsent: vi.fn()
  };

  return {
    default: {
      start: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue('READY'),
      newVisitor: vi.fn().mockReturnValue(mockVisitor),
      close: vi.fn().mockResolvedValue(undefined),
      getVisitor: vi.fn().mockReturnValue(mockVisitor)
    },
    FSSdkStatus: {
      SDK_NOT_INITIALIZED: 'NOT_INITIALIZED',
      SDK_INITIALIZING: 'INITIALIZING',
      SDK_INITIALIZED: 'SDK_INITIALIZED',
      SDK_FAILED: 'FAILED'
    },
    FSFetchStatus: {
      FETCH_REQUIRED: 'FETCH_REQUIRED',
      FETCHED: 'FETCHED',
      FETCHING: 'FETCHING',
      PANIC: 'PANIC'
    }
  };
});

describe('ABTastyProvider', () => {
  let provider: ABTastyProvider;
  const mockEnvId = 'env-test-id';
  const mockApiKey = 'api-test-key';
  const mockConfig = { fetchNow: true };
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ABTastyProvider({
      envId: mockEnvId,
      apiKey: mockApiKey,
      config: mockConfig,
      logger: mockLogger
    });
  });

  describe('constructor', () => {
    it('should initialize with the correct properties', () => {
      expect(provider.metadata.name).toBe('ABTasty');
      expect(provider.runsOn).toBe('client');
      expect(provider.events).toBeInstanceOf(OpenFeatureEventEmitter);
    });
  });

  describe('status', () => {
    it('should return NOT_READY when Flagship status is SDK_NOT_INITIALIZED', () => {
      vi.mocked(Flagship.getStatus).mockReturnValue(FSSdkStatus.SDK_NOT_INITIALIZED);
      expect(provider.status).toBe(ClientProviderStatus.NOT_READY);
    });

    it('should return NOT_READY when Flagship status is SDK_INITIALIZING', () => {
      vi.mocked(Flagship.getStatus).mockReturnValue(FSSdkStatus.SDK_INITIALIZING);
      expect(provider.status).toBe(ClientProviderStatus.NOT_READY);
    });

    it('should return READY when Flagship status is SDK_READY', () => {
      vi.mocked(Flagship.getStatus).mockReturnValue(FSSdkStatus.SDK_INITIALIZED);
      expect(provider.status).toBe(ClientProviderStatus.READY);
    });
  });

  describe('initialize', () => {
    const mockVisitor = {
      visitorId: 'test-visitor',
      hasConsented: true,
      flagsStatus: { status: 'READY' },
      getFlag: vi.fn(),
      fetchFlags: vi.fn().mockResolvedValue(undefined),
      updateContext: vi.fn(),
      setConsent: vi.fn()
    };

    beforeEach(() => {
      vi.mocked(Flagship.newVisitor).mockReturnValue(mockVisitor as unknown as Visitor);
    });

    it('should initialize SDK and visitor with full context', async () => {
      vi.mocked(Flagship.getStatus).mockReturnValue(FSSdkStatus.SDK_NOT_INITIALIZED);

      const mockContext = {
        targetingKey: 'user-123',
        name: 'Test User',
        age: 30,
        fsVisitorInfo: { hasConsented: true }
      };

      const emitSpy = vi.spyOn(provider.events, 'emit');

      await provider.initialize?.(mockContext);

      expect(Flagship.start).toHaveBeenCalledTimes(1);
      expect(Flagship.start).toHaveBeenCalledWith(
        mockEnvId,
        mockApiKey,
        expect.objectContaining({
          fetchNow: false,
          logManager: expect.anything()
        })
      );

      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);
      expect(Flagship.newVisitor).toHaveBeenCalledWith({
        visitorId: 'user-123',
        hasConsented: true,
        context: {
          name: 'Test User',
          age: 30
        }
      });
      expect(mockVisitor.fetchFlags).toHaveBeenCalledTimes(1);
      expect(mockVisitor.fetchFlags).toHaveBeenCalled();

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(ProviderEvents.Ready);
    });

    it('should initialize SDK and visitor with partial context', async () => {
      vi.mocked(Flagship.getStatus).mockReturnValue(FSSdkStatus.SDK_NOT_INITIALIZED);

      const mockContext = {
        name: 'Test User',
        age: 30
      };

      const emitSpy = vi.spyOn(provider.events, 'emit');

      await provider.initialize?.(mockContext as unknown as FlagshipContext);

      expect(Flagship.start).toHaveBeenCalledTimes(1);
      expect(Flagship.start).toHaveBeenCalledWith(
        mockEnvId,
        mockApiKey,
        expect.objectContaining({
          fetchNow: false,
          logManager: expect.anything()
        })
      );

      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);
      expect(Flagship.newVisitor).toHaveBeenCalledWith({
        context: {
          name: 'Test User',
          age: 30
        }
      });

      expect(mockVisitor.fetchFlags).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(ProviderEvents.Ready);
    });

    it('should initialize SDK and visitor with empty context', async () => {
      vi.mocked(Flagship.getStatus).mockReturnValue(FSSdkStatus.SDK_NOT_INITIALIZED);


      const emitSpy = vi.spyOn(provider.events, 'emit');

      await provider.initialize?.();

      expect(Flagship.start).toHaveBeenCalledTimes(1);
      expect(Flagship.start).toHaveBeenCalledWith(
        mockEnvId,
        mockApiKey,
        expect.objectContaining({
          fetchNow: false,
          logManager: expect.anything()
        })
      );

      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);
      expect(Flagship.newVisitor).toHaveBeenCalledWith({ context: {} });

      expect(mockVisitor.fetchFlags).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(ProviderEvents.Ready);
    });
  });

  describe('onContextChange', () => {
    const mockVisitor = {
      visitorId: 'test-visitor',
      hasConsented: true,
      flagsStatus: { status: 'FETCHED' },
      context: {},
      getFlag: vi.fn(),
      fetchFlags: vi.fn().mockImplementation(async () => {
        mockVisitor.flagsStatus.status = 'FETCHED';
      }),
      updateContext: vi.fn().mockImplementation((context) => {
        if (JSON.stringify(mockVisitor.context) !== JSON.stringify(context)) {
          mockVisitor.flagsStatus.status = 'FETCH_REQUIRED';
        }
        mockVisitor.context = {
          ...mockVisitor.context,
          ...context
        };
      }),
      setConsent: vi.fn()
    };

    beforeEach(() => {
      vi.mocked(Flagship.newVisitor).mockImplementation((args) => {
        mockVisitor.visitorId = args.visitorId || 'test-visitor';
        mockVisitor.hasConsented = args.hasConsented || false;
        if (JSON.stringify(mockVisitor.context) !== JSON.stringify(args.context)) {
          mockVisitor.flagsStatus = { status: 'FETCH_REQUIRED' };
          mockVisitor.context = args.context || {};
        }
        return mockVisitor as unknown as Visitor;
      });
    });

    it('should update visitor context and fetch flags when non-targetingKey context changes', async () => {
      await provider.initialize?.({
        targetingKey: 'user-123',
        name: 'Test User',
        fsVisitorInfo: { hasConsented: true }
      });

      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);
      expect(mockVisitor.updateContext).toHaveBeenCalledTimes(0);
      expect(mockVisitor.fetchFlags).toHaveBeenCalledTimes(1);

      const newContext = {
        targetingKey: 'user-123',
        name: 'Updated User'
      };

      await provider.onContextChange?.({}, newContext);

      expect(mockVisitor.updateContext).toHaveBeenCalledTimes(1);
      expect(mockVisitor.updateContext).toHaveBeenCalledWith({ name: 'Updated User' });
      expect(mockVisitor.fetchFlags).toHaveBeenCalledTimes(2);
      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);
    });


    it('should update visitor context and fetch flags when consent changes', async () => {
      await provider.initialize?.({
        targetingKey: 'user-123',
        fsVisitorInfo: { hasConsented: true }
      });

      expect(mockVisitor.updateContext).toHaveBeenCalledTimes(0);
      expect(mockVisitor.fetchFlags).toHaveBeenCalledTimes(1);
      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);

      const newContext = {
        targetingKey: 'user-123',
        fsVisitorInfo: { hasConsented: false }
      };

      await provider.onContextChange?.({}, newContext);

      expect(mockVisitor.updateContext).toHaveBeenCalledTimes(1);
      expect(mockVisitor.fetchFlags).toHaveBeenCalledTimes(1);
      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);
    });

    it('should create a new visitor when targetingKey changes', async () => {
      await provider.initialize?.({
        targetingKey: 'user-123',
        fsVisitorInfo: { hasConsented: true }
      });
      expect(Flagship.newVisitor).toHaveBeenCalledTimes(1);
      expect(Flagship.newVisitor).toHaveBeenNthCalledWith(1,{
        visitorId: 'user-123',
        hasConsented: true,
        context: {}
      });

      await provider.onContextChange?.({}, {
        targetingKey: 'user-456',
        fsVisitorInfo: { hasConsented: true }
      });

      expect(Flagship.newVisitor).toHaveBeenCalledTimes(2);
      expect(Flagship.newVisitor).toHaveBeenNthCalledWith(2,{
        visitorId: 'user-456',
        hasConsented: true,
        context: {}
      });

      await provider.onContextChange?.({}, {});

      expect(Flagship.newVisitor).toHaveBeenCalledTimes(3);
      expect(Flagship.newVisitor).toHaveBeenNthCalledWith(3,{ context: {} });
    });
  });

  describe('flag resolution', () => {
    const getFlag = vi.fn();
    const mockVisitor = {
      visitorId: 'test-visitor',
      hasConsented: true,
      flagsStatus: { status: 'READY' },
      getFlag,
      fetchFlags: vi.fn().mockResolvedValue(undefined),
      updateContext: vi.fn(),
      setConsent: vi.fn()
    };

    beforeAll(() => {
      vi.mocked(Flagship.newVisitor).mockReturnValue(mockVisitor as unknown as Visitor);
    });

    beforeEach(async () => {
      await provider.initialize?.();
    });

    it('should resolve boolean flags', () => {
      const mockFlag = {
        getValue: vi.fn().mockReturnValue(true),
        metadata: {
          campaignId: '123',
          variationId: 'abc'
        }
      };

      getFlag.mockReturnValue(mockFlag);

      const result = provider.resolveBooleanEvaluation('my-flag', false);

      expect(getFlag).toHaveBeenCalledTimes(1);
      expect(getFlag).toHaveBeenCalledWith('my-flag');
      expect(mockFlag.getValue).toHaveBeenCalledTimes(1);
      expect(mockFlag.getValue).toHaveBeenCalledWith(false);
      expect(result.value).toBe(true);
      expect(result.flagMetadata).toEqual({
        campaignId: '123',
        variationId: 'abc',
        slug: ''
      });
    });

    it('should resolve string flags', () => {
      const mockFlag = {
        getValue: vi.fn().mockReturnValue('value'),
        metadata: {
          campaignId: '123',
          variationId: 'abc',
          slug: 'test-slug'
        }
      };

      getFlag.mockReturnValue(mockFlag);

      const result = provider.resolveStringEvaluation('my-flag', 'default');

      expect(getFlag).toHaveBeenCalledTimes(1);
      expect(getFlag).toHaveBeenCalledWith('my-flag');
      expect(mockFlag.getValue).toHaveBeenCalledTimes(1);
      expect(mockFlag.getValue).toHaveBeenCalledWith('default');
      expect(result.value).toBe('value');
    });

    it('should resolve number flags', () => {
      const mockFlag = {
        getValue: vi.fn().mockReturnValue(42),
        metadata: {
          campaignId: '123',
          variationId: 'abc',
          slug: 'test-slug'
        }
      };

      getFlag.mockReturnValue(mockFlag);

      const result = provider.resolveNumberEvaluation('my-flag', 0);

      expect(getFlag).toHaveBeenCalledTimes(1);
      expect(getFlag).toHaveBeenCalledWith('my-flag');
      expect(mockFlag.getValue).toHaveBeenCalledTimes(1);
      expect(mockFlag.getValue).toHaveBeenCalledWith(0);
      expect(result.value).toBe(42);
    });

    it('should resolve object flags', () => {
      const mockFlag = {
        getValue: vi.fn().mockReturnValue({ key: 'value' }),
        metadata: {
          campaignId: '123',
          variationId: 'abc',
          slug: 'test-slug'
        }
      };

      getFlag.mockReturnValue(mockFlag);

      const result = provider.resolveObjectEvaluation('my-flag', {});

      expect(getFlag).toHaveBeenCalledTimes(1);
      expect(getFlag).toHaveBeenCalledWith('my-flag');
      expect(mockFlag.getValue).toHaveBeenCalledTimes(1);
      expect(mockFlag.getValue).toHaveBeenCalledWith({});
      expect(result.value).toEqual({ key: 'value' });
    });

    it('should return default value when flag is not found', () => {
      getFlag.mockReturnValue(undefined);

      const result = provider.resolveStringEvaluation('non-existent-flag', 'default-value');

      expect(result.value).toBe('default-value');
    });
  });

  describe('onClose', () => {
    it('should call Flagship.close', async () => {
      await provider.onClose?.();
      expect(Flagship.close).toHaveBeenCalled();
    });
  });
});
