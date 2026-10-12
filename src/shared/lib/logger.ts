type LogFn = (...args: unknown[]) => void;

export default function logger(log: LogFn, ...message: unknown[]): void {
  if (import.meta.env.MODE !== "development") return;
  log(...message);
}

export const info = (...message: unknown[]): void => {
  logger(console.log, ...message);
};

export const error = (...message: unknown[]): void => {
  logger(console.error, ...message);
};
