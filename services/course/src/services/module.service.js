const { Module } = require('../models/Module');
const { Topic } = require('../models/Topic');
const { Course } = require('../models/Course');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const courseService = require('./course.service');

const getModuleById = async (moduleId) => {
  const mod = await Module.findOne({ moduleId });
  if (!mod) {
    throw new AppError('Module not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return mod;
};

const listModulesForCourse = async (courseId, { publishedOnly = false } = {}) => {
  await courseService.getActiveCourse(courseId, { publishedOnly });
  return Module.find({ courseId }).sort({ order: 1 });
};

const createModule = async (courseId, { title, order }) => {
  const course = await courseService.getActiveCourse(courseId);
  const mod = await Module.create({ courseId, title, order, topicIds: [] });
  course.moduleIds.push(mod.moduleId);
  await course.save();
  return mod;
};

const updateModule = async (moduleId, { title, order }) => {
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (order !== undefined) updates.order = order;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400, ERROR_CODES.E_VALIDATION);
  }

  const mod = await Module.findOneAndUpdate(
    { moduleId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!mod) {
    throw new AppError('Module not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return mod;
};

const deleteModule = async (moduleId) => {
  const mod = await getModuleById(moduleId);
  await Topic.deleteMany({ moduleId });
  await Module.deleteOne({ moduleId });

  await Course.updateOne(
    { courseId: mod.courseId },
    { $pull: { moduleIds: moduleId } },
  );

  return mod;
};

module.exports = {
  getModuleById,
  listModulesForCourse,
  createModule,
  updateModule,
  deleteModule,
};
