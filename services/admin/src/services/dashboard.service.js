const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const {
  userClient,
  courseClient,
  enrollmentClient,
  paymentClient,
  certificateClient,
} = require('../clients/statsClients');

const SERVICE_FETCHERS = [
  { service: 'user', client: userClient },
  { service: 'course', client: courseClient },
  { service: 'enrollment', client: enrollmentClient },
  { service: 'payment', client: paymentClient },
  { service: 'certificate', client: certificateClient },
];

const getDashboard = async () => {
  const results = await Promise.allSettled(
    SERVICE_FETCHERS.map(({ client }) => client.getStats()),
  );

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
    partialErrors,
  };
};

module.exports = { getDashboard };
