const { AppError, ERROR_CODES, cache } = require('@eduelderly/shared');
const {
  userClient,
  courseClient,
  enrollmentClient,
  paymentClient,
  certificateClient,
  emailQueueClient,
  pdfQueueClient,
} = require('../clients/statsClients');

const SERVICE_FETCHERS = [
  { service: 'user', client: userClient },
  { service: 'course', client: courseClient },
  { service: 'enrollment', client: enrollmentClient },
  { service: 'payment', client: paymentClient },
  { service: 'certificate', client: certificateClient },
];

const QUEUE_FETCHERS = [
  { key: 'email', client: emailQueueClient },
  { key: 'certificatePdf', client: pdfQueueClient },
];

/**
 * Queue counts are best-effort: a missing worker service shows as null
 * rather than counting against the "all services down" threshold.
 */
const getQueueHealth = async () => {
  const results = await Promise.allSettled(QUEUE_FETCHERS.map(({ client }) => client.getStats()));
  const queues = {};
  results.forEach((result, index) => {
    queues[QUEUE_FETCHERS[index].key] = result.status === 'fulfilled' ? result.value : null;
  });
  return queues;
};

const getDashboard = async () => {
  const [results, queues] = await Promise.all([
    Promise.allSettled(SERVICE_FETCHERS.map(({ client }) => client.getStats())),
    getQueueHealth(),
  ]);

  const partialErrors = [];
  const data = {};

  results.forEach((result, index) => {
    const { service } = SERVICE_FETCHERS[index];
    if (result.status === 'fulfilled') {
      data[service] = result.value;
    } else {
      partialErrors.push({
        service,
        message: result.reason?.message || 'Request failed',
      });
    }
  });

  if (partialErrors.length === SERVICE_FETCHERS.length) {
    throw new AppError(
      'All downstream services unavailable',
      503,
      ERROR_CODES.E_SERVICE_UNAVAILABLE,
    );
  }

  const users = data.user
    ? {
      total: data.user.totalUsers,
      active: data.user.activeUsers,
      learners: data.user.learners,
      admins: data.user.admins,
    }
    : null;

  const courses = data.course
    ? {
      total: data.course.totalCourses,
      published: data.course.publishedCourses,
      draft: data.course.draftCourses,
    }
    : null;

  const enrollments = data.enrollment
    ? {
      total: data.enrollment.totalEnrollments,
      active: data.enrollment.activeEnrollments,
      completed: data.enrollment.completedEnrollments,
    }
    : null;

  const revenue = data.payment
    ? {
      total: data.payment.revenueTotal,
      currency: data.payment.currency,
      successfulOrders: data.payment.successfulOrders,
      pendingOrders: data.payment.pendingOrders,
      totalOrders: data.payment.totalOrders,
    }
    : null;

  return {
    users,
    courses,
    enrollments,
    revenue,
    completions: data.enrollment?.completedEnrollments ?? 0,
    certificates: data.certificate?.totalCertificates ?? 0,
    queues,
    partialErrors,
  };
};

/**
 * The three numbers the public landing page shows. Deliberately excludes
 * revenue and order counts — this route needs no authentication, so nothing
 * commercially sensitive may appear in it.
 *
 * Cached for five minutes: the landing page is the most-hit page on the site
 * and these counts move slowly, so it should not fan out to three services on
 * every visit. Any service that is down contributes 0 rather than failing the
 * whole response.
 */
const PUBLIC_STATS_TTL_SECONDS = 300;

const getPublicStats = async () => {
  const { value } = await cache.remember('admin:public-stats', PUBLIC_STATS_TTL_SECONDS, async () => {
    const [users, courses, certificates] = await Promise.allSettled([
      userClient.getStats(),
      courseClient.getStats(),
      certificateClient.getStats(),
    ]);

    const valueOr = (result, key) => (result.status === 'fulfilled' ? result.value?.[key] ?? 0 : 0);

    return {
      learners: valueOr(users, 'totalUsers'),
      courses: valueOr(courses, 'publishedCourses'),
      certificates: valueOr(certificates, 'totalCertificates'),
    };
  });

  return value;
};

module.exports = { getDashboard, getPublicStats };
