export const logger = {
  info: (...args) => console.log('[info]', ...args),
  warn: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[debug]', ...args);
    }
  },
};

