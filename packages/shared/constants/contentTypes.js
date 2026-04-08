const CONTENT_TYPES = Object.freeze({
  VIDEO: 'video',
  TEXT:  'text',
  PDF:   'pdf',
});

const CONTENT_TYPE_VALUES = Object.values(CONTENT_TYPES);
// Used in Mongoose enum: { enum: CONTENT_TYPE_VALUES }

module.exports = { CONTENT_TYPES, CONTENT_TYPE_VALUES };