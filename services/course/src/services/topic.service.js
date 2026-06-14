const { Topic } = require('../models/Topic');
const { Module } = require('../models/Module');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const moduleService = require('./module.service');

const getTopicById = async (topicId) => {
  const topic = await Topic.findOne({ topicId });
  if (!topic) {
    throw new AppError('Topic not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return topic;
};

const createTopic = async (moduleId, payload) => {
  const mod = await moduleService.getModuleById(moduleId);
  const topic = await Topic.create({
    ...payload,
    moduleId,
    courseId: mod.courseId,
  });

  mod.topicIds.push(topic.topicId);
  await mod.save();
  return topic;
};

const updateTopic = async (topicId, payload) => {
  const allowed = ['title', 'contentType', 'contentUrl', 'durationMinutes', 'order'];
  const updates = {};
  allowed.forEach((field) => {
    if (payload[field] !== undefined) updates[field] = payload[field];
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400, ERROR_CODES.E_VALIDATION);
  }

  const topic = await Topic.findOneAndUpdate(
    { topicId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!topic) {
    throw new AppError('Topic not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return topic;
};

const deleteTopic = async (topicId) => {
  const topic = await getTopicById(topicId);
  await Topic.deleteOne({ topicId });
  await Module.updateOne(
    { moduleId: topic.moduleId },
    { $pull: { topicIds: topicId } },
  );
  return topic;
};

module.exports = {
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
};
