const { catchAsync, toDashboardDTO } = require('@eduelderly/shared');
const dashboardService = require('../services/dashboard.service');

const getDashboard = catchAsync(async (_req, res) => {
  const dashboard = await dashboardService.getDashboard();
  res.status(200).json({
    success: true,
    data: toDashboardDTO(dashboard),
  });
});

module.exports = { getDashboard };
