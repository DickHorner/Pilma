#!/usr/bin/env node
import { CompanionServer } from './server';
import { getStartupMessages, resolveStartupConfig } from './startup';

/**
 * Main entry point for the companion service.
 * Starts the HTTP server with explicit startup configuration.
 */

function main(): void {
  const { port, host, secret } = resolveStartupConfig(process.env);

  const server = new CompanionServer({ port, host, secret });

  server.start()
    .then(() => {
      for (const message of getStartupMessages()) {
        console.log(message);
      }
    })
    .catch((err) => {
      console.error('Failed to start companion service:', err);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.stop().then(() => {
      console.log('Companion service stopped.');
      process.exit(0);
    });
  });
}

main();
