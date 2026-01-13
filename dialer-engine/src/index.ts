import http from 'http';
import { config, validateConfig } from './config';
import { logger } from './utils/Logger';
import { DialerEngine } from './core/Engine';

const engine = new DialerEngine();

// Health check HTTP server
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    if (engine.isRunning()) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', ...engine.getStatus() }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unhealthy' }));
    }
  } else if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.getStatus()));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

async function main(): Promise<void> {
  logger.info({ nodeEnv: config.nodeEnv }, 'Dialer Engine starting...');

  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Start health server
    healthServer.listen(3000, () => {
      logger.info({ port: 3000 }, 'Health server listening');
    });

    // Start engine
    await engine.start();

    logger.info('='.repeat(50));
    logger.info('DIALER ENGINE IS RUNNING');
    logger.info(`Voice Adapter: ${config.voiceAdapter}`);
    logger.info(`Scheduler Interval: ${config.engine.schedulerIntervalMs}ms`);
    logger.info(`Executor Interval: ${config.engine.executorIntervalMs}ms`);
    logger.info(`Timer Processor Interval: ${config.engine.timerProcessorIntervalMs}ms`);
    logger.info('='.repeat(50));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.fatal({ errorMessage, errorStack }, 'Failed to start engine');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');
  
  try {
    await engine.stop();
    healthServer.close();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

// Start
main();
