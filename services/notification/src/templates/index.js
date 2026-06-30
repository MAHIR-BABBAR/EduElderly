const { renderAuthEmail, VALID_TYPES: AUTH_TYPES } = require('./authTemplates');
const { renderLearnerEmail, LEARNER_TYPES } = require('./learnerTemplates');

const VALID_TYPES = [...AUTH_TYPES, ...LEARNER_TYPES];

const renderEmail = (type, templateData = {}) => {
  if (AUTH_TYPES.includes(type)) {
    return renderAuthEmail(type, templateData);
  }
  if (LEARNER_TYPES.includes(type)) {
    return renderLearnerEmail(type, templateData);
  }
  throw new Error(`Unknown email type: ${type}`);
};

module.exports = { VALID_TYPES, renderEmail };
