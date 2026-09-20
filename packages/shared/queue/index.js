/**
 * Thin BullMQ wrapper with one opinion: every queue in EduElderly retries with
 * exponential backoff, keeps failed jobs around for a week so they can be
 * inspected, and logs lifecycle events as structured JSON.
 *
 * Queues are opt-in per process. `isQueueEnabled()` is true when REDIS_URL is
 * configured (and not in tests unless QUEUE_ENABLED=true), so a service can run
 * without Redis by doing the work inline. Callers should branch on it:
 *
 *   if (isQueueEnabled()) await enqueue(id); else await doInline(id);
 */

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { createLogger } = require('../utils/logger');

const log = createLogger('queue');

const openConnections = [];
const openQueues = [];
const openWorkers = [];

const DEFAULT_JOB_OPTIONS = Object.freeze({
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s, 16s, 32s
  removeOnComplete: { age: 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
});

const isQueueEnabled = () => {
  if (process.env.QUEUE_ENABLED === 'false') return false;
  if (!process.env.REDIS_URL) return false;
  if (process.env.QUEUE_ENABLED === 'true') return true;
  return process.env.NODE_ENV !== 'test';
};

const createConnection = () => {
  const connection = new IORedis(process.env.REDIS_URL, {
    // BullMQ requires this so blocking commands are not cut short.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  connection.on('error', (error) => log.error('Redis connection error', { message: error.message }));
  openConnections.push(connection);
  return connection;
};

// Key prefix so several deployments (or a test run next to a live worker) can
// share one Redis without stealing each other's jobs.
const queuePrefix = () => process.env.QUEUE_PREFIX || 'bull';

const createQueue = (name, { defaultJobOptions = {} } = {}) => {
  const queue = new Queue(name, {
    connection: createConnection(),
    prefix: queuePrefix(),
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...defaultJobOptions },
  });
  openQueues.push(queue);
  return queue;
};

/**
 * @param {string} name
 * @param {(job: import('bullmq').Job) => Promise<unknown>} processor
 * @param {{ concurrency?: number }} [options]
 */
const createWorker = (name, processor, { concurrency = 5 } = {}) => {
  const worker = new Worker(name, processor, {
    connection: createConnection(),
    prefix: queuePrefix(),
    concurrency,
  });

  worker.on('completed', (job) => {
    log.info('Job completed', { queue: name, jobId: job.id, attempt: job.attemptsMade });
  });
  worker.on('failed', (job, error) => {
    const maxAttempts = job?.opts?.attempts ?? 1;
    const exhausted = job ? job.attemptsMade >= maxAttempts : true;
    log.warn(exhausted ? 'Job failed permanently' : 'Job failed, will retry', {
      queue: name,
      jobId: job?.id,
      attempt: job?.attemptsMade,
      maxAttempts,
      message: error.message,
    });
  });
  worker.on('error', (error) => log.error('Worker error', { queue: name, message: error.message }));

  openWorkers.push(worker);
  return worker;
};

const getQueueStats = async (queue) => {
  const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
  return { name: queue.name, ...counts };
};

/** Close workers first so in-flight jobs finish, then queues and connections. */
const closeQueues = async () => {
  await Promise.allSettled(openWorkers.splice(0).map((worker) => worker.close()));
  await Promise.allSettled(openQueues.splice(0).map((queue) => queue.close()));
  await Promise.allSettled(openConnections.splice(0).map((connection) => connection.quit()));
};

module.exports = {
  DEFAULT_JOB_OPTIONS,
  isQueueEnabled,
  createQueue,
  createWorker,
  getQueueStats,
  closeQueues,
};
