/**
 * Pluggable storage adapter for certificate PDFs.
 * MVP uses on-demand generation; save/get are optional hooks for future backends.
 */
class StorageAdapter {
  async save(_certId, _buffer) {
    throw new Error('StorageAdapter.save() must be implemented');
  }

  async get(_certId) {
    throw new Error('StorageAdapter.get() must be implemented');
  }
}

module.exports = { StorageAdapter };
