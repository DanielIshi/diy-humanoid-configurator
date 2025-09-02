import { createServer } from './app.js';
import { getEnv } from './config/env.js';
import { logger } from './lib/logger.js';

const { PORT } = getEnv();

const app = createServer();
app.listen(PORT, () => {
  logger.info(`Backend listening on http://localhost:${PORT}`);
});

