const { createQueue, createWorker, getQueueStats, isQueueEnabled } = require('@eduelderly/shared');
const { renderAndStoreCertificate } = require('../services/pdf.service');

const PDF_QUEUE = 'certificate-pdf';

let queue = null;

const getPdfQueue = () => {
  if (!queue) queue = createQueue(PDF_QUEUE);
  return queue;
};

/** Job id = certId, so duplicate enqueues collapse into one job. */
const enqueuePdfRender = (certId) => getPdfQueue().add('render', { certId }, { jobId: certId });

const startPdfWorker = () =>
  createWorker(
    PDF_QUEUE,
    (job) =>
      renderAndStoreCertificate(job.data.certId, {
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
      }),
    // PDF rendering is CPU-bound; keep concurrency low.
    { concurrency: 2 },
  );

const getPdfQueueStats = async () => {
  if (!isQueueEnabled()) return { enabled: false };
  return { enabled: true, ...(await getQueueStats(getPdfQueue())) };
};

module.exports = { PDF_QUEUE, enqueuePdfRender, startPdfWorker, getPdfQueueStats };
