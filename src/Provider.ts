import { ClientProviderStatus,
  EvaluationContext,
  EvaluationContextValue,
  JsonValue,
  OpenFeatureEventEmitter,
  Paradigm,
  Provider,
  ProviderEvents,
  ProviderMetadata,
  ResolutionDetails } from '@openfeature/web-sdk';
import { FlagshipContext, ProviderConstructor } from './types';
import Flagship, { FSFetchStatus,
  FSSdkStatus,
  IBucketingConfig,
  IDecisionApiConfig,
  IEdgeConfig,
  primitive,
  Visitor } from '@flagship.io/js-sdk';
import { AdapterLogger } from './AdapterLogger';

/**
 * ABTastyProvider is an OpenFeature provider that integrates with the Flagship SDK.
 */
export class ABTastyProvider implements Provider {
  metadata: ProviderMetadata = { name: 'ABTasty' };
  runsOn: Paradigm = 'client';
  events = new OpenFeatureEventEmitter();

  get status(): ClientProviderStatus {
    const fsStatus = Flagship.getStatus();
    switch (fsStatus) {
      case FSSdkStatus.SDK_NOT_INITIALIZED:
      case FSSdkStatus.SDK_INITIALIZING:
        return ClientProviderStatus.NOT_READY;
      default:
        return ClientProviderStatus.READY;
    }
  }

  private _logger?: AdapterLogger;
  private _envId: string;
  private _apiKey: string;
  private _config?: IDecisionApiConfig | IBucketingConfig | IEdgeConfig;
  private _visitor?: Visitor;

  public constructor({ envId, apiKey, config, logger }: ProviderConstructor) {
    this._config = config;

    this._envId = envId;
    this._apiKey = apiKey;

    if (config) {
      this._config = config;
    }

    if (logger) {
      this._logger = new AdapterLogger(logger);
    }
  }

  private toPrimitiveRecord(input: Record<string, EvaluationContextValue>): Record<string, primitive> {
    const output: Record<string, primitive> = {};
    for (const [key, value] of Object.entries(input)) {
      if (
        value !== null &&
        typeof value !== 'object' &&
        typeof value !== 'function'
      ) {
        output[key] = value;
      }
    }
    return output;
  }

  private async createVisitor(context?: FlagshipContext): Promise<Visitor> {
    const { fsVisitorInfo, targetingKey, ...userContext } = context || { fsVisitorInfo: { hasConsented: undefined as unknown as boolean } };

    const visitor = Flagship.newVisitor({
      ...fsVisitorInfo,
      visitorId: targetingKey,
      context: this.toPrimitiveRecord(userContext)
    });
    await visitor.fetchFlags();

    return visitor;
  }

  private async updateVisitorFlags(context: FlagshipContext): Promise<Visitor | undefined> {
    const { fsVisitorInfo, targetingKey, ...userContext } = context;

    if (targetingKey != this._visitor?.visitorId) {
      const visitor = await this.createVisitor(context);
      this._visitor = visitor;
      return visitor;
    }

    const hasConsented = fsVisitorInfo?.hasConsented;

    if (
      hasConsented !== undefined &&
      hasConsented !== this._visitor?.hasConsented
    ) {
      this._visitor?.setConsent(fsVisitorInfo.hasConsented);
    }

    this._visitor?.updateContext(this.toPrimitiveRecord(userContext));

    if (
      this._visitor &&
      this._visitor.flagsStatus.status === FSFetchStatus.FETCH_REQUIRED
    ) {
      await this._visitor.fetchFlags();
    }
    return this._visitor;
  }

  private async initializeSDK(): Promise<void> {
    if (Flagship.getStatus() === FSSdkStatus.SDK_NOT_INITIALIZED) {
      await Flagship.start(this._envId, this._apiKey, {
        ...this._config,
        fetchNow: false,
        logManager: this._logger
      });
    }
  }

  async initialize?(context?: FlagshipContext): Promise<void> {
    await this.initializeSDK();
    this._visitor = await this.createVisitor(context);
    this.events.emit(ProviderEvents.Ready);
  }

  async onContextChange?(
    _oldContext: EvaluationContext,
    newContext: EvaluationContext
  ): Promise<void> {
    await this.updateVisitorFlags(newContext as FlagshipContext);
  }

  private resolveEvaluation<T>(flagKey: string, defaultValue: T): ResolutionDetails<T> {
    const flag = this._visitor?.getFlag(flagKey);
    const flagValue = flag?.getValue(defaultValue) as T;
    const flagMetadata = flag?.metadata;

    const sanitizedFlagMetadata = flagMetadata
      ? {
        ...flagMetadata,
        slug: flagMetadata.slug ?? ''
      }
      : undefined;

    return {
      value: flagValue || defaultValue,
      flagMetadata: sanitizedFlagMetadata
    };
  }
  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean
  ): ResolutionDetails<boolean> {
    return this.resolveEvaluation(flagKey, defaultValue);
  }
  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string
  ): ResolutionDetails<string> {
    return this.resolveEvaluation(flagKey, defaultValue);
  }
  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number
  ): ResolutionDetails<number> {
    return this.resolveEvaluation(flagKey, defaultValue);
  }
  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T
  ): ResolutionDetails<T> {
    return this.resolveEvaluation(flagKey, defaultValue);
  }

  onClose?(): Promise<void> {
    return Flagship.close();
  }
}
