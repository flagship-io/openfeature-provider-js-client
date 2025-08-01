# Flagship OpenFeature Provider for Web

An OpenFeature provider implementation for [Flagship](https://flagship.io) feature management platform, designed for web applications.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Provider Options](#provider-options)
  - [SDK Configuration Options](#sdk-configuration-options)
  - [Visitor Information](#visitor-information)
  - [Context Management](#context-management)
- [Advanced Usage](#advanced-usage)
  - [Custom Logging](#custom-logging)
  - [Context Changes](#context-changes)
  - [Event Handling](#event-handling)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

This provider connects the [OpenFeature](https://openfeature.dev) web SDK with the Flagship feature management platform, allowing you to manage feature flags in your web applications. It implements the OpenFeature Provider interface and integrates with the Flagship JS SDK.

## Installation

```bash
# Using npm
npm install @flagship.io/openfeature-provider-js-client @openfeature/web-sdk

# Using yarn
yarn add @flagship.io/openfeature-provider-js-client @openfeature/web-sdk

# Using pnpm
pnpm add @flagship.io/openfeature-provider-js-client @openfeature/web-sdk
```

## Quick Start

```typescript
import { OpenFeature } from '@openfeature/web-sdk';
import { ABTastyProvider } from '@flagship.io/openfeature-provider-js-client';

// Initialize the Flagship provider
const provider = new ABTastyProvider({
  envId: 'your-environment-id', 
  apiKey: 'your-api-key',
});

// Set the provider in OpenFeature
OpenFeature.setProvider(provider);

// Get a client instance
const client = OpenFeature.getClient();

// Set evaluation context (user information)
await client.setContext({
  targetingKey: 'user-123', // Used as the visitorId in Flagship
  fsVisitorInfo: {
    hasConsented: true, // Required for GDPR compliance
  },
  // Additional user context
  age: 30,
  country: 'US'
});

// Use the client to evaluate flags
const isFeatureEnabled = await client.getBooleanValue('feature-flag', false);
if (isFeatureEnabled) {
  // Feature is enabled
}
```

## Configuration

### Provider Options

The `ABTastyProvider` constructor accepts the following options:

```typescript
new ABTastyProvider({
  envId: string;          // Your Flagship environment ID (required)
  apiKey: string;         // Your Flagship API key (required)
  config?: object;        // Configuration options for the Flagship SDK
  logger?: Logger;        // OpenFeature logger instance
});
```

### SDK Configuration Options

Please refer to the [Flagship JS SDK documentation](https://docs.developers.flagship.io/docs/js-reference#sdk-configuration) for available configuration options.

### Example with Configuration

```typescript
import { ABTastyProvider } from '@flagship.io/openfeature-provider-js-client';
import { LogLevel } from '@flagship.io/js-sdk';

const provider = new ABTastyProvider({
  envId: 'your-env-id',
  apiKey: 'your-api-key',
  config: {
    logLevel: LogLevel.INFO,

  }
});
```

### Visitor Information

The visitor information is provided through the OpenFeature context:

```typescript
client.setContext({
  targetingKey: 'user-123', // Used as the visitorId in Flagship
  fsVisitorInfo: {
    hasConsented: true,     // Required for GDPR compliance
  },
  // Other context attributes that will be passed to Flagship
  country: 'US',
  language: 'en',
  age: 30
});
```

### Context Management

The provider automatically handles context changes:

```typescript
// Initial context
await client.setContext({
  targetingKey: 'user-123',
  fsVisitorInfo: { hasConsented: true },
  country: 'US'
});

// Later, update the context
await client.setContext({
  targetingKey: 'user-123', // Same user
  fsVisitorInfo: { hasConsented: true },
  country: 'FR' // User moved to France
});

// Or set a completely new user
await client.setContext({
  targetingKey: 'user-456', // Different user
  fsVisitorInfo: { hasConsented: true },
  country: 'DE'
});
```

## Advanced Usage

### Custom Logging

You can provide a custom logger to the provider:

```typescript
import { OpenFeature, ConsoleLogger, LogLevel } from '@openfeature/web-sdk';
import { ABTastyProvider } from '@flagship.io/openfeature-provider-js-client';

// Create a custom logger
const logger = new ConsoleLogger(LogLevel.INFO);

// Initialize the provider with the logger
const provider = new ABTastyProvider({
  envId: 'your-env-id',
  apiKey: 'your-api-key',
  logger: logger
});

OpenFeature.setProvider(provider);
```

### Context Changes

The provider automatically handles context changes:

```typescript
// When the user context changes
client.setContext({
  targetingKey: 'user-123',
  fsVisitorInfo: { hasConsented: true },
  country: 'US',
  // other attributes
});

// The provider will:
// 1. Update the visitor context
// 2. Fetch flags if needed
// 3. Apply the changes for future flag evaluations
```

### Event Handling

You can listen to provider events:

```typescript
import { OpenFeature, ProviderEvents } from '@openfeature/web-sdk';
import { ABTastyProvider } from '@flagship.io/openfeature-provider-js-client';

const provider = new ABTastyProvider({
  envId: 'your-env-id',
  apiKey: 'your-api-key'
});

// Listen for the ready event
provider.events.on(ProviderEvents.Ready, () => {
  console.log('Provider is ready!');
});

// Listen for the error event
provider.events.on(ProviderEvents.Error, (error) => {
  console.error('Provider error:', error);
});

OpenFeature.setProvider(provider);
```

## Examples

### Basic Feature Flag Evaluation

```typescript
// Get client
const client = OpenFeature.getClient();

// Set context
await client.setContext({
  targetingKey: 'user-123',
  fsVisitorInfo: { hasConsented: true }
});

// Boolean flag
const isEnabled = client.getBooleanValue('new-feature', false);

// String flag
const variant = client.getStringValue('button-color', 'blue');

// Number flag
const timeout = client.getNumberValue('api-timeout', 1000);

// Object flag
const config = client.getObjectValue('feature-config', { enabled: false });
```

### Handling Evaluation Details

```typescript
// Get evaluation details
const details = client.getBooleanDetails('new-feature', false);

console.log(details.value);         // The flag value
console.log(details.flagMetadata);  // Metadata about the flag
```

## Troubleshooting

### Provider Not Ready

If the provider is not transitioning to the ready state:

1. Check your environment ID and API key
2. Check the provider status: `console.log(OpenFeature.getProvider().status)`

### Flag Evaluations Not Working

If flag evaluations are not returning expected values:

1. Make sure the provider is in the ready state
2. Verify the flag exists in your Flagship dashboard
3. Check the visitor context is correctly set

### Context Not Updating

If changes to the context are not reflected in flag evaluations:

1. Make sure you're awaiting `client.setContext()`
2. Check the structure of your context object
3. Verify that `targetingKey` and `fsVisitorInfo` are properly set
