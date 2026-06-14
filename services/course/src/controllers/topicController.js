const { catchAsync } = require('@eduelderly/shared');
const topicService = require('../services/topic.service');

const createTopic = catchAsync(async (req, res) => {
  const topic = await topicService.createTopic(req.params.moduleId, req.body);
  res.status(201).json({ success: true, data: topic });
});

const updateTopic = catchAsync(async (req, res) => {
  const topic = await topicService.updateTopic(req.params.topicId, req.body);
  res.status(200).json({ success: true, data: topic });
});

const deleteTopic = catchAsync(async (req, res) => {
  await topicService.deleteTopic(req.params.topicId);
  res.status(200).json({ success: true, message: 'Topic deleted' });
});

module.exports = {
  createTopic,
  updateTopic,
  deleteTopic,
};
