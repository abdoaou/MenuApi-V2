const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', '..', 'logs');

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString();
}

function format(level, message, meta = {}) {
  return JSON.stringify({ time: timestamp(), level, message, ...meta });
}

function writeFile(line) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    ensureLogsDir();
    const file = path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFileSync(file, `${line}\n`);
  } catch {
    /* ignore disk errors */
  }
}

function log(level, message, meta) {
  const line = format(level, message, meta);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : 'log'](line);
  }
  writeFile(line);
}

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      log('debug', message, meta);
    }
  },
};
