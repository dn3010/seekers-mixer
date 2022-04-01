//common Log interface used internally, but any logger that follows this interface
//can be injected/used

//LogFn is the interface for the actual logging implementation.
export type LogFn = (
  level: Level,
  message: unknown,
  ...messages: unknown[]
) => void;

export type LogMod = (mesasge: unknown) => unknown;

export type Level = 'D' | 'I' | 'W' | 'E';

export class Logger {
  private constructor(public readonly logfn: LogFn) {}
  error(message: unknown, ...messages: unknown[]): void {
    this.logfn('E', message, ...messages);
  }
  warn(message: unknown, ...messages: unknown[]): void {
    this.logfn('W', message, ...messages);
  }
  info(message: unknown, ...messages: unknown[]): void {
    this.logfn('I', message, ...messages);
  }
  debug(message: unknown, ...messages: unknown[]): void {
    this.logfn('D', message, ...messages);
  }
  local(f: LogMod): Logger {
    return new Logger((lvl, message, ...messages) => {
      this.logfn(lvl, f(message), ...messages);
    });
  }
  w(message: unknown, ...messages: unknown[]): void {
    return this.warn(message, ...messages);
  }
  d(message: unknown, ...messages: unknown[]): void {
    return this.debug(message, ...messages);
  }
  i(message: unknown, ...messages: unknown[]): void {
    return this.info(message, ...messages);
  }
  e(message: unknown, ...messages: unknown[]): void {
    return this.error(message, ...messages);
  }
  static create(fn: LogFn): Logger {
    return new Logger(fn);
  }
}

export const noopLogger = Logger.create(() => {
  /* No-op*/
});

function stringify(message: unknown): string {
  if (message === null) {
    return 'null';
  }
  if (Array.isArray(message)) {
    return message.map(stringify).join(', ');
  }
  switch (typeof message) {
    case 'string':
      return message;
    case 'number':
      return String(message);
    case 'boolean':
      return String(message);
    case 'function':
      return '<Function>';
    case 'undefined':
      return 'undefined';
    case 'object':
      if (message == null) return 'null';
      if (message instanceof Error) {
        return message.message;
      } else if (message.constructor && message.constructor.name) {
        return `<${message.constructor.name} ${JSON.stringify(message)}>`;
      } else {
        return JSON.stringify(message);
      }
    default:
      return JSON.stringify(message);
  }
}

export const consoleLogger = Logger.create((level, message, ...messages) => {
  const renderedMessage = [message, ...messages].map(stringify).join(' ');
  const finalMessage = `[${level}]${renderedMessage}`;
  switch (level) {
    case 'E':
      // eslint-disable-next-line no-console
      return console.error(finalMessage);
    case 'W':
      // eslint-disable-next-line no-console
      return console.warn(finalMessage);
    default:
      // eslint-disable-next-line no-console
      return console.log(finalMessage);
  }
});

export function prefix(pfx: string): LogMod {
  return message => pfx + stringify(message);
}

export function logMe(prefixStr: string, loggerParam?: Logger): Logger {
  return (loggerParam !== undefined ? loggerParam : noopLogger).local(
    prefix(prefixStr + ' '),
  );
}
