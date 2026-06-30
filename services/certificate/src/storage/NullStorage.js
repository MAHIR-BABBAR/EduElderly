const { StorageAdapter } = require('./StorageAdapter');

/**
 * Default MVP storage — no persistence; PDFs are generated on demand.
 */
class NullStorage extends StorageAdapter {
  async save() {
    return null;
  }

  async get() {
    return null;
  }
}

module.exports = { NullStorage };
