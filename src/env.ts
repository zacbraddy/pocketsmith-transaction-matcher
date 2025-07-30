/**
 * Environment variable configuration and validation
 */

export interface EnvConfig {
  // PocketSmith API Configuration
  pocketsmithApiKey: string;
  pocketsmithBaseUrl: string;

  // UniRate API Configuration
  unirateApiKey: string;

  // Application Configuration
  nodeEnv: string;
  logLevel: string;

  // File Processing
  inputCsvPath: string;

  // Matching Configuration
  daysTolerance: number;
  dateRangeBufferDays: number;
  amountToleranceExact: number;
  amountToleranceForeignPercent: number;
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value || defaultValue!;
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

/**
 * Get environment variable as boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Load and validate environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  return {
    // PocketSmith API Configuration
    pocketsmithApiKey: getEnvVar('POCKETSMITH_API_KEY', 'development_placeholder_key'),
    pocketsmithBaseUrl: getEnvVar('POCKETSMITH_BASE_URL', 'https://api.pocketsmith.com/v2'),

    // UniRate API Configuration
    unirateApiKey: getEnvVar('UNIRATE_API_KEY'),

    // Application Configuration
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    logLevel: getEnvVar('LOG_LEVEL', 'info'),

    // File Processing
    inputCsvPath: getEnvVar('INPUT_CSV_PATH', './data/input'),
    outputPath: getEnvVar('OUTPUT_PATH', './data/output'),
    backupPath: getEnvVar('BACKUP_PATH', './data/backup'),

    // Matching Configuration
    matchingThreshold: getEnvNumber('MATCHING_THRESHOLD', 0.8),
    autoApproveMatches: getEnvBoolean('AUTO_APPROVE_MATCHES', false),
    batchSize: getEnvNumber('BATCH_SIZE', 100),
    daysTolerance: getEnvNumber('DAYS_TOLERANCE', 2),
    dateRangeBufferDays: getEnvNumber('DATE_RANGE_BUFFER_DAYS', 5),
    amountToleranceExact: getEnvNumber('AMOUNT_TOLERANCE_EXACT', 0.01),
    amountToleranceForeignPercent: getEnvNumber('AMOUNT_TOLERANCE_FOREIGN_PERCENT', 0.2),

    // Optional: Database
    databaseUrl: process.env.DATABASE_URL,

    // Optional: Rate limiting for API calls
    apiRateLimitMs: getEnvNumber('API_RATE_LIMIT_MS', 1000),
  };
}

let _env: EnvConfig | null = null;

function getEnv(): EnvConfig {
  if (!_env) {
    _env = loadEnvConfig();
  }
  return _env;
}

export const env = new Proxy({} as EnvConfig, {
  get(target, prop) {
    return getEnv()[prop as keyof EnvConfig];
  }
});
