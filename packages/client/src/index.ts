/**
 * @titan/sdk — JavaScript/TypeScript SDK for Titan Production Suite
 *
 * Provides typed client bindings for all Titan gRPC services,
 * device management, color pipeline, and compliance workflows.
 *
 * @packageDocumentation
 */

// ── Core Client ────────────────────────────────────────────────────────────

export interface TitanClientConfig {
  authServiceUrl?: string;
  colorVisionUrl?: string;
  productionIntelUrl?: string;
  deviceSyncUrl?: string;
  timeout?: number;
}

export interface TitanAuth {
  token: string;
  expiresAt: string;
}

// ── Color Pipeline Types ──────────────────────────────────────────────────

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface CMYKColor {
  C: number;
  M: number;
  Y: number;
  K: number;
}

export interface RGBColor {
  R: number;
  G: number;
  B: number;
}

export type ColorSpace = 'sRGB' | 'AdobeRGB' | 'Lab' | 'XYZ' | 'CMYK';

export type RenderingIntent = 'perceptual' | 'relative-colorimetric' | 'saturation' | 'absolute-colorimetric';

export interface ColorConversionResult {
  input: LabColor;
  output: LabColor;
  inGamut: boolean;
  deltaE: number;
}

// ── Delta-E Types ─────────────────────────────────────────────────────────

export type DeltaEFormula = 'de76' | 'de94' | 'de2000' | 'cmc' | 'din99';

export interface DeltaEResult {
  deltaE: number;
  formula: DeltaEFormula;
  label: 'imperceptible' | 'very-slight' | 'slight' | 'noticeable' | 'appreciable' | 'large';
}

// ── ICC Profile Types ─────────────────────────────────────────────────────

export interface ICCProfile {
  profileId: string;
  name: string;
  filePath: string;
  colorSpace: string;
  profileClass: string;
  renderingIntent: string;
  vendor: string;
  model: string;
  description: string;
}

// ── Spot Color Types ──────────────────────────────────────────────────────

export interface SpotColor {
  colorId: string;
  name: string;
  library: string;
  hex: string;
  lab: LabColor;
  srgb: RGBColor;
}

// ── Compliance Types ──────────────────────────────────────────────────────

export type ComplianceStandard = 'g7' | 'fogra39' | 'fogra51' | 'swop' | 'gracol' | 'iso12647';

export interface ComplianceTarget {
  standard: ComplianceStandard;
  name: string;
  maxOverallDeltaE: number;
  grayBalanceA: number;
  grayBalanceB: number;
  solidInkDensity: { cyan: number; magenta: number; yellow: number; black: number };
}

export interface ComplianceResult {
  certId: string;
  standard: ComplianceStandard;
  compliant: boolean;
  grade: string;
  overallDeltaE: number;
  grayBalancePass: boolean;
  densityPass: boolean;
}

// ── Device Types ──────────────────────────────────────────────────────────

export type DeviceType = 'printer' | 'cutter' | 'print-and-cut' | 'scanner' | 'laminator';

export interface Device {
  deviceId: string;
  name: string;
  vendor: string;
  model: string;
  type: DeviceType;
  status: 'online' | 'offline' | 'error' | 'busy';
  driverVersion: string;
}

// ── Job Types ─────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Job {
  jobId: string;
  title: string;
  status: JobStatus;
  type: string;
  priority: JobPriority;
  deviceId?: string;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ── Nesting Types ─────────────────────────────────────────────────────────

export interface NestingPart {
  partId: string;
  width: number;
  height: number;
  rotationAllowed: boolean;
  minSpacing: number;
}

export interface NestingResult {
  efficiency: number;
  totalPartArea: number;
  usedArea: number;
  placements: Array<{ partId: string; x: number; y: number; rotated: boolean }>;
  unplacedParts: string[];
}

// ── SDK Client Interface ──────────────────────────────────────────────────

export interface TitanSDK {
  readonly auth: {
    login(username: string, password: string): Promise<TitanAuth>;
    validate(token: string): Promise<boolean>;
  };

  readonly color: {
    convertToLab(color: LabColor | RGBColor | CMYKColor, fromSpace: ColorSpace): Promise<ColorConversionResult>;
    computeDeltaE(a: LabColor, b: LabColor, formula?: DeltaEFormula): Promise<DeltaEResult>;
    findNearestSpotColor(color: LabColor, library?: string): Promise<SpotColor>;
    mapToGamut(color: LabColor, intent?: RenderingIntent): Promise<ColorConversionResult>;
  };

  readonly profiles: {
    list(): Promise<ICCProfile[]>;
    import(filePath: string): Promise<ICCProfile>;
    compare(a: ICCProfile, b: ICCProfile): Promise<{ score: number; recommendations: string[] }>;
  };

  readonly compliance: {
    evaluate(standard: ComplianceStandard, measurements: Array<{ patchId: string; lab: LabColor; density: number }>): Promise<ComplianceResult>;
    getTarget(standard: ComplianceStandard): Promise<ComplianceTarget>;
  };

  readonly devices: {
    list(): Promise<Device[]>;
    getStatus(deviceId: string): Promise<Device>;
  };

  readonly jobs: {
    list(filter?: { status?: JobStatus; deviceId?: string }): Promise<Job[]>;
    submit(job: { title: string; type: string; deviceId?: string; data?: unknown }): Promise<Job>;
    cancel(jobId: string): Promise<void>;
  };

  readonly nesting: {
    score(parts: NestingPart[], materialWidth: number, kerfWidth: number): Promise<NestingResult>;
    optimize(parts: NestingPart[], materialWidth: number, iterations?: number): Promise<NestingResult>;
  };
}

// ── Version ────────────────────────────────────────────────────────────────

export const SDK_VERSION = '0.1.0';
