#!/usr/bin/env node
import { CompanionServer } from './server';

/**
 * Main entry point for the companion service.
 * Starts the HTTP server with default configuration.
 */

function generateSecret(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function main(): void {
  const port = parseInt(process.env.PORT || '8787', 10);
  const host = process.env.HOST || '127.0.0.1';
  const secret = process.env.SECRET || generateSecret();

  const server = new CompanionServer({ port, host, secret });

  server.start()
    .then(() => {
      console.log('Companion service started successfully.');
      console.log(`Copy this secret to your extension options: ${secret}`);
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
