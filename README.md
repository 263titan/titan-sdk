# @titan/sdk — JavaScript/TypeScript SDK Reference

> **Version 0.1.0** — Typed client bindings for all Titan Production Suite gRPC services.

### Core Languages & Runtime

<a href="https://nodejs.org">![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=node.js&logoColor=white)</a> <a href="https://pnpm.io">![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)</a> <a href="https://www.typescriptlang.org">![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)</a>

### Protocols

<a href="https://gRPC.io">![gRPC](https://img.shields.io/badge/gRPC-244C5A?style=for-the-badge&logo=grpc&logoColor=white)</a>

### Tools

<a href="https://nx.dev">![Nx](https://img.shields.io/badge/Nx-ACB6C2?style=for-the-badge&logo=nx&logoColor=white)</a>

## Installation

**npm:**

```bash
npm install @titan/sdk
```

**pnpm workspace reference** (monorepo):

```json
{
  "dependencies": {
    "@titan/sdk": "workspace:*"
  }
}
```

## Quick Start

```ts
import { createTitanClient, type TitanSDK, type Device, type Job } from '@titan/sdk';

async function main() {
  const sdk: TitanSDK = createTitanClient({
    authServiceUrl: 'https://auth.titan.local:50051',
    deviceSyncUrl: 'https://devicesync.titan.local:50052',
    colorVisionUrl: 'https://colorvision.titan.local:50053',
    productionIntelUrl: 'https://prodintel.titan.local:50054',
    timeout: 30_000,
  });

  // Authenticate.
  const auth = await sdk.auth.login('operator@printshop.com', 's3cret');
  console.log(`Authenticated, token expires ${auth.expiresAt}`);

  // List available devices.
  const devices: Device[] = await sdk.devices.list();
  for (const device of devices) {
    console.log(`${device.name} (${device.vendor} ${device.model}) — ${device.status}`);
  }

  // Submit a print job.
  const job: Job = await sdk.jobs.submit({
    title: 'Banner v3 Final',
    type: 'print',
    deviceId: devices[0].deviceId,
    data: { filePath: '/uploads/banner-v3.pdf', copies: 1 },
  });
  console.log(`Job submitted: ${job.jobId} (status: ${job.status})`);
}

main().catch(console.error);
```

## Color Management

```ts
import type { TitanSDK, LabColor, RGBColor, ICCProfile, SpotColor, DeltaEResult } from '@titan/sdk';

async function colorExamples(sdk: TitanSDK) {
  // Convert an sRGB color to Lab.
  const red: RGBColor = { R: 220, G: 38, B: 38 };
  const result = await sdk.color.convertToLab(red, 'sRGB');
  console.log(`Input Lab:  L=${result.input.L} a=${result.input.a} b=${result.input.b}`);
  console.log(`Output Lab: L=${result.output.L} a=${result.output.a} b=${result.output.b}`);
  console.log(`In gamut: ${result.inGamut}, ΔE: ${result.deltaE}`);

  // Compute ΔE2000 between two Lab colors.
  const white: LabColor = { L: 95.0, a: 0.0, b: 0.0 };
  const warmWhite: LabColor = { L: 94.5, a: 1.2, b: 2.8 };
  const delta: DeltaEResult = await sdk.color.computeDeltaE(white, warmWhite, 'de2000');
  console.log(`ΔE2000 = ${delta.deltaE} (${delta.label})`);

  // Find nearest Pantone spot color.
  const spot: SpotColor = await sdk.color.findNearestSpotColor(
    { L: 45.0, a: 55.0, b: -10.0 },
    'PANTONE'
  );
  console.log(`Nearest spot: ${spot.name} (${spot.library}) — ${spot.hex}`);

  // Map an out-of-gamut color into the target gamut.
  const oogColor: LabColor = { L: 60.0, a: -80.0, b: 70.0 };
  const mapped = await sdk.color.mapToGamut(oogColor, 'relative-colorimetric');
  console.log(`Gamut-mapped ΔE: ${mapped.deltaE}, in gamut: ${mapped.inGamut}`);
}
```

## ICC Profile Management

```ts
import type { TitanSDK, ICCProfile } from '@titan/sdk';

async function profileExamples(sdk: TitanSDK) {
  // List all installed profiles.
  const profiles: ICCProfile[] = await sdk.profiles.list();
  for (const p of profiles) {
    console.log(`${p.name} (${p.profileId}) — ${p.colorSpace} / ${p.profileClass} — ${p.vendor} ${p.model}`);
  }

  // Import a new profile.
  const imported: ICCProfile = await sdk.profiles.import('/profiles/epson-sc-p9570.icc');
  console.log(`Imported: ${imported.name} (${imported.profileId})`);

  // Compare two profiles.
  if (profiles.length >= 2) {
    const comparison = await sdk.profiles.compare(profiles[0], profiles[1]);
    console.log(`Match score: ${comparison.score}`);
    for (const rec of comparison.recommendations) {
      console.log(`  Recommendation: ${rec}`);
    }
  }
}
```

## Compliance Testing

```ts
import type { TitanSDK, LabColor, ComplianceResult } from '@titan/sdk';

async function complianceExample(sdk: TitanSDK) {
  // Fetch the Fogra39 target for reference.
  const target = await sdk.compliance.getTarget('fogra39');
  console.log(`Target: ${target.name}`);
  console.log(`Max ΔE: ${target.maxOverallDeltaE}`);
  console.log(`Gray balance: a=${target.grayBalanceA} b=${target.grayBalanceB}`);
  console.log(`Solid ink density: C=${target.solidInkDensity.cyan} M=${target.solidInkDensity.magenta} Y=${target.solidInkDensity.yellow} K=${target.solidInkDensity.black}`);

  // Submit measured patch data for evaluation.
  const measurements: Array<{ patchId: string; lab: LabColor; density: number }> = [
    { patchId: 'C-100', lab: { L: 54.2, a: -38.1, b: -49.7 }, density: 1.40 },
    { patchId: 'M-100', lab: { L: 47.5, a: 73.8, b: -6.2 }, density: 1.35 },
    { patchId: 'Y-100', lab: { L: 88.6, a: -5.4, b: 95.1 }, density: 1.05 },
    { patchId: 'K-100', lab: { L: 16.0, a: 0.0, b: -0.1 }, density: 1.70 },
    // ... additional patches from spectrophotometer readings
  ];

  const result: ComplianceResult = await sdk.compliance.evaluate('fogra39', measurements);
  console.log(`Cert ID: ${result.certId}`);
  console.log(`Compliant: ${result.compliant} (grade: ${result.grade})`);
  console.log(`Overall ΔE: ${result.overallDeltaE}`);
  console.log(`Gray balance: ${result.grayBalancePass}, Density: ${result.densityPass}`);
}
```

## Device and Job Management

```ts
import type { TitanSDK, Device, Job, JobStatus } from '@titan/sdk';

async function deviceJobExamples(sdk: TitanSDK) {
  // List all devices.
  const devices: Device[] = await sdk.devices.list();
  for (const d of devices) {
    console.log(`[${d.deviceId}] ${d.name} — ${d.status} (driver ${d.driverVersion})`);
  }

  // Get specific device status.
  if (devices.length > 0) {
    const status: Device = await sdk.devices.getStatus(devices[0].deviceId);
    console.log(`${status.name}: ${status.status}`);
  }

  // List jobs with a status filter.
  const activeJobs: Job[] = await sdk.jobs.list({ status: 'running' });
  for (const j of activeJobs) {
    console.log(`[${j.jobId}] ${j.title} — ${j.progress}% on ${j.deviceId ?? 'unassigned'}`);
  }

  // Submit a cut job.
  const cutJob: Job = await sdk.jobs.submit({
    title: 'Vinyl Sticker Run',
    type: 'cut',
    deviceId: devices.find(d => d.type === 'cutter')?.deviceId,
    data: { material: 'vinyl', contour: true },
  });
  console.log(`Cut job: ${cutJob.jobId}`);

  // Cancel a job.
  await sdk.jobs.cancel(cutJob.jobId);
  console.log(`Cancelled ${cutJob.jobId}`);
}
```

## Nesting Optimization

```ts
import type { TitanSDK, NestingPart, NestingResult } from '@titan/sdk';

async function nestingExample(sdk: TitanSDK) {
  const parts: NestingPart[] = [
    { partId: 'card-front', width: 85, height: 55, rotationAllowed: false, minSpacing: 3 },
    { partId: 'card-back', width: 85, height: 55, rotationAllowed: false, minSpacing: 3 },
    { partId: 'label-lg', width: 100, height: 40, rotationAllowed: true, minSpacing: 2 },
    { partId: 'label-sm', width: 50, height: 25, rotationAllowed: true, minSpacing: 2 },
    { partId: 'sticker-circle', width: 30, height: 30, rotationAllowed: true, minSpacing: 1 },
  ];

  // Single-pass score against a 610mm-wide roll.
  const scored: NestingResult = await sdk.nesting.score(parts, 610, 0.2);
  console.log(`Efficiency: ${(scored.efficiency * 100).toFixed(1)}%`);
  console.log(`Placed ${scored.placements.length} parts, ${scored.unplacedParts.length} unplaced`);
  for (const p of scored.placements) {
    console.log(`  ${p.partId} at (${p.x}, ${p.y}) rotated=${p.rotated}`);
  }

  // Multi-iteration optimization for better results.
  const optimized: NestingResult = await sdk.nesting.optimize(parts, 610, 50);
  console.log(`Optimized efficiency: ${(optimized.efficiency * 100).toFixed(1)}%`);
  console.log(`Total part area: ${optimized.totalPartArea} mm², used: ${optimized.usedArea} mm²`);
  if (optimized.unplacedParts.length > 0) {
    console.log(`Unplaced: ${optimized.unplacedParts.join(', ')}`);
  }
}
```

## WebSocket Events

Subscribe to real-time job updates from the SDK client:

```ts
import type { TitanSDK, Job } from '@titan/sdk';

async function realtimeExample(sdk: TitanSDK) {
  const job: Job = await sdk.jobs.submit({
    title: 'Rush Order #4821',
    type: 'print',
  });

  // Poll-based monitoring (the SDK exposes list/getStatus for streaming adapters).
  let lastProgress = -1;
  const poll = setInterval(async () => {
    const jobs: Job[] = await sdk.jobs.list({ status: 'running' });
    const current = jobs.find(j => j.jobId === job.jobId);
    if (!current) {
      clearInterval(poll);
      // Job finished — check final state.
      const all: Job[] = await sdk.jobs.list();
      const final = all.find(j => j.jobId === job.jobId);
      console.log(`Job ${job.jobId} finished: ${final?.status}`);
      return;
    }
    if (current.progress !== lastProgress) {
      lastProgress = current.progress;
      console.log(`Job ${job.jobId}: ${current.progress}%`);
    }
  }, 2000);
}
```

## Error Handling

The SDK throws typed errors. Catch and inspect them:

```ts
import { TitanSDKError, type TitanSDK } from '@titan/sdk';

async function safeExample(sdk: TitanSDK) {
  try {
    await sdk.jobs.submit({ title: 'Test', type: 'print', deviceId: 'nonexistent' });
  } catch (err) {
    if (err instanceof TitanSDKError) {
      console.error(`SDK error [${err.code}]: ${err.message}`);
      // err.code is one of: 'AUTH_FAILED', 'DEVICE_NOT_FOUND', 'DEVICE_BUSY',
      // 'INVALID_REQUEST', 'TIMEOUT', 'UNAVAILABLE', 'UNKNOWN'
    } else {
      throw err;
    }
  }
}
```

## API Reference

### `createTitanClient(config: TitanClientConfig): TitanSDK`

Factory function. Returns a `TitanSDK` instance connected to the configured services.

### `TitanClientConfig`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `authServiceUrl` | `string?` | — | Auth service gRPC endpoint |
| `colorVisionUrl` | `string?` | — | Color Vision service endpoint |
| `productionIntelUrl` | `string?` | — | Production Intel service endpoint |
| `deviceSyncUrl` | `string?` | — | DeviceSync service endpoint |
| `timeout` | `number?` | — | Request timeout in milliseconds |

### `sdk.auth`

| Method | Signature | Returns |
|--------|-----------|---------|
| `login` | `(username: string, password: string)` | `Promise<TitanAuth>` |
| `validate` | `(token: string)` | `Promise<boolean>` |

### `sdk.color`

| Method | Signature | Returns |
|--------|-----------|---------|
| `convertToLab` | `(color: LabColor \| RGBColor \| CMYKColor, fromSpace: ColorSpace)` | `Promise<ColorConversionResult>` |
| `computeDeltaE` | `(a: LabColor, b: LabColor, formula?: DeltaEFormula)` | `Promise<DeltaEResult>` |
| `findNearestSpotColor` | `(color: LabColor, library?: string)` | `Promise<SpotColor>` |
| `mapToGamut` | `(color: LabColor, intent?: RenderingIntent)` | `Promise<ColorConversionResult>` |

### `sdk.profiles`

| Method | Signature | Returns |
|--------|-----------|---------|
| `list` | `()` | `Promise<ICCProfile[]>` |
| `import` | `(filePath: string)` | `Promise<ICCProfile>` |
| `compare` | `(a: ICCProfile, b: ICCProfile)` | `Promise<{ score: number; recommendations: string[] }>` |

### `sdk.compliance`

| Method | Signature | Returns |
|--------|-----------|---------|
| `evaluate` | `(standard: ComplianceStandard, measurements: Array<{ patchId: string; lab: LabColor; density: number }>)` | `Promise<ComplianceResult>` |
| `getTarget` | `(standard: ComplianceStandard)` | `Promise<ComplianceTarget>` |

### `sdk.devices`

| Method | Signature | Returns |
|--------|-----------|---------|
| `list` | `()` | `Promise<Device[]>` |
| `getStatus` | `(deviceId: string)` | `Promise<Device>` |

### `sdk.jobs`

| Method | Signature | Returns |
|--------|-----------|---------|
| `list` | `(filter?: { status?: JobStatus; deviceId?: string })` | `Promise<Job[]>` |
| `submit` | `(job: { title: string; type: string; deviceId?: string; data?: unknown })` | `Promise<Job>` |
| `cancel` | `(jobId: string)` | `Promise<void>` |

### `sdk.nesting`

| Method | Signature | Returns |
|--------|-----------|---------|
| `score` | `(parts: NestingPart[], materialWidth: number, kerfWidth: number)` | `Promise<NestingResult>` |
| `optimize` | `(parts: NestingPart[], materialWidth: number, iterations?: number)` | `Promise<NestingResult>` |

### Type Reference

| Type | Kind | Description |
|------|------|-------------|
| `LabColor` | `{ L, a, b: number }` | CIELAB color value |
| `RGBColor` | `{ R, G, B: number }` | sRGB color value |
| `CMYKColor` | `{ C, M, Y, K: number }` | CMYK color value |
| `ColorSpace` | `'sRGB' \| 'AdobeRGB' \| 'Lab' \| 'XYZ' \| 'CMYK'` | Source color space |
| `RenderingIntent` | `'perceptual' \| 'relative-colorimetric' \| 'saturation' \| 'absolute-colorimetric'` | ICC rendering intent |
| `ColorConversionResult` | `{ input: LabColor; output: LabColor; inGamut: boolean; deltaE: number }` | Conversion output with gamut info |
| `DeltaEFormula` | `'de76' \| 'de94' \| 'de2000' \| 'cmc' \| 'din99'` | ΔE computation method |
| `DeltaEResult` | `{ deltaE: number; formula: DeltaEFormula; label: string }` | ΔE value with perceptual label |
| `ICCProfile` | `{ profileId, name, filePath, colorSpace, profileClass, renderingIntent, vendor, model, description: string }` | Installed ICC profile metadata |
| `SpotColor` | `{ colorId, name, library, hex: string; lab: LabColor; srgb: RGBColor }` | Spot color with multi-space values |
| `ComplianceStandard` | `'g7' \| 'fogra39' \| 'fogra51' \| 'swop' \| 'gracol' \| 'iso12647'` | Print standard reference |
| `ComplianceTarget` | `{ standard, name, maxOverallDeltaE, grayBalanceA, grayBalanceB, solidInkDensity: { cyan, magenta, yellow, black: number } }` | Target values for a standard |
| `ComplianceResult` | `{ certId, standard, compliant, grade, overallDeltaE, grayBalancePass, densityPass }` | Evaluation result |
| `DeviceType` | `'printer' \| 'cutter' \| 'print-and-cut' \| 'scanner' \| 'laminator'` | Device category |
| `Device` | `{ deviceId, name, vendor, model, type, status, driverVersion: string }` | Device metadata |
| `JobStatus` | `'queued' \| 'running' \| 'paused' \| 'completed' \| 'failed' \| 'cancelled'` | Job state |
| `JobPriority` | `'urgent' \| 'high' \| 'normal' \| 'low'` | Job priority level |
| `Job` | `{ jobId, title, status, type, priority, deviceId?, progress, createdAt, startedAt?, completedAt? }` | Job metadata |
| `NestingPart` | `{ partId, width, height, minSpacing: number; rotationAllowed: boolean }` | Part geometry for nesting |
| `NestingResult` | `{ efficiency, totalPartArea, usedArea, placements, unplacedParts }` | Nesting layout output |
| `TitanAuth` | `{ token: string; expiresAt: string }` | Authentication result |
| `SDK_VERSION` | `'0.1.0'` | Package version constant |
