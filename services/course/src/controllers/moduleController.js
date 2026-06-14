const { catchAsync } = require('@eduelderly/shared');
const moduleService = require('../services/module.service');

const listModules = catchAsync(async (req, res) => {
  const modules = await moduleService.listModulesForCourse(req.params.courseId, { publishedOnly: true });
  res.status(200).json({ success: true, data: modules });
});

const createModule = catchAsync(async (req, res) => {
  const mod = await moduleService.createModule(req.params.courseId, req.body);
  res.status(201).json({ success: true, data: mod });
});

const updateModule = catchAsync(async (req, res) => {
  const mod = await moduleService.updateModule(req.params.moduleId, req.body);
  res.status(200).json({ success: true, data: mod });
});

const deleteModule = catchAsync(async (req, res) => {
  await moduleService.deleteModule(req.params.moduleId);
  res.status(200).json({ success: true, message: 'Module deleted' });
});

module.exports = {
  listModules,
  createModule,
  updateModule,
  deleteModule,
};
