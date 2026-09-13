const fs = require('fs/promises');
const path = require('path');
const { StorageAdapter } = require('./StorageAdapter');

/**
 * Stores certificate PDFs on the local filesystem.
 *
 * Writes are atomic (temp file + rename) so a crash mid-write never leaves a
 * truncated PDF that would be served to a learner. The directory comes from
 * CERT_STORAGE_DIR and defaults to `<service>/storage`, which is gitignored and
 * mounted as a named volume in the production compose file.
 */
class LocalDiskStorage extends StorageAdapter {
  constructor(directory) {
    super();
    this.directory = directory || process.env.CERT_STORAGE_DIR || path.resolve(process.cwd(), 'storage');
  }

  filePath(certId) {
    // certId is a UUID we generate; strip anything else defensively.
    const safeId = String(certId).replace(/[^a-zA-Z0-9-]/g, '');
    return path.join(this.directory, `${safeId}.pdf`);
  }

  async save(certId, buffer) {
    await fs.mkdir(this.directory, { recursive: true });
    const finalPath = this.filePath(certId);
    const tempPath = `${finalPath}.${process.pid}.tmp`;
    await fs.writeFile(tempPath, buffer);
    await fs.rename(tempPath, finalPath);
    return finalPath;
  }

  async get(certId) {
    try {
      return await fs.readFile(this.filePath(certId));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async exists(certId) {
    try {
      await fs.access(this.filePath(certId));
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { LocalDiskStorage };
