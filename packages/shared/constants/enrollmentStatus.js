const ENROLLMENT_STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
});

const ENROLLMENT_STATUS_VALUES = Object.freeze(Object.values(ENROLLMENT_STATUS));

module.exports = { ENROLLMENT_STATUS, ENROLLMENT_STATUS_VALUES };
