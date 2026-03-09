export type StartupConfig = {
  port: number;
  host: string;
  secret: string;
};

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = '127.0.0.1';

export function resolveStartupConfig(env: NodeJS.ProcessEnv): StartupConfig {
  const rawPort = env.PORT || String(DEFAULT_PORT);
  const port = parseInt(rawPort, 10);
  const host = env.HOST || DEFAULT_HOST;
  const secret = env.SECRET?.trim();

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  if (!secret) {
    throw new Error(
      'Missing SECRET environment variable. Set an explicit shared secret before starting the companion service.'
    );
  }

  return { port, host, secret };
}

export function getStartupMessages(): string[] {
  return [
    'Companion service started successfully.',
    'Configure the same shared credential in your trusted local client.',
  ];
}
