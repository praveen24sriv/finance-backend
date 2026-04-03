import winston from 'winston';
import { env } from '../config/env';

// Winston logger with different formats per environment.
// In dev: colorized, human-readable. In prod: JSON for log aggregators (Datadog, etc.)
// Custom levels include 'http' for Morgan request logging.
const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const customLevels = {
  levels: { error: 0, warn: 1, info: 2, http: 3, debug: 4 },
  colors: { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'cyan' },
};

winston.addColors(customLevels.colors);

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});