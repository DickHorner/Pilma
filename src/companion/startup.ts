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
  const allowNonLoopbackHost = isTrue(env.ALLOW_NON_LOOPBACK_HOST);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  if (!isLoopbackHost(host) && !allowNonLoopbackHost) {
    throw new Error(
      `Refusing to bind to non-loopback host "${host}". Set ALLOW_NON_LOOPBACK_HOST=true to opt in explicitly.`
    );
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

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === '127.0.0.1' || normalized === 'localhost' || normalized === '::1';
}

function isTrue(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}
