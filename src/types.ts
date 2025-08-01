import { IBucketingConfig,
  IDecisionApiConfig,
  IEdgeConfig } from '@flagship.io/js-sdk';
import { EvaluationContext, Logger } from '@openfeature/web-sdk';

export type ProviderConstructor = {
  envId: string;
  apiKey: string;
  config?: IDecisionApiConfig | IBucketingConfig | IEdgeConfig;
  logger?: Logger;
};

export type VisitorInfo = {
  hasConsented: boolean;
  isAuthenticated?: boolean;
};

export type FlagshipContext = EvaluationContext & {
  fsVisitorInfo: VisitorInfo;
};
