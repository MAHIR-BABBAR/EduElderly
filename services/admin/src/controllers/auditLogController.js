const { catchAsync, toPublicAuditLogDTO } = require('@eduelderly/shared');
const auditLogService = require('../services/auditLog.service');

const listAuditLogs = catchAsync(async (req, res) => {
  const { logs, pagination } = await auditLogService.listAuditLogs(req.query);
  res.status(200).json({
    success: true,
    data: {
      logs: logs.map(toPublicAuditLogDTO),
      pagination,
    },
  });
});

const createAuditLogInternal = catchAsync(async (req, res) => {
  const log = await auditLogService.createAuditLog(req.body);
  res.status(201).json({
    success: true,
    data: toPublicAuditLogDTO(log),
  });
});

module.exports = { listAuditLogs, createAuditLogInternal };
