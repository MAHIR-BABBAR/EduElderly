const { LocalDiskStorage } = require('./LocalDiskStorage');
const { NullStorage } = require('./NullStorage');

/**
 * Storage backend selected by CERT_STORAGE:
 *   local (default) — filesystem, see LocalDiskStorage
 *   none            — never persist; PDFs are regenerated on every download
 *
 * An S3-compatible adapter slots in here without touching the service code.
 */
let instance = null;

const createStorage = () => {
  const kind = (process.env.CERT_STORAGE || 'local').toLowerCase();
  if (kind === 'none' || kind === 'null') return new NullStorage();
  return new LocalDiskStorage();
};

const getStorage = () => {
  if (!instance) instance = createStorage();
  return instance;
};

/** Test hook so suites can point at a temp directory. */
const resetStorage = () => {
  instance = null;
};

module.exports = { getStorage, createStorage, resetStorage };
