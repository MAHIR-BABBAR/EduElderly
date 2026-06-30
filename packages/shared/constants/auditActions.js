const AUDIT_ACTION = Object.freeze({
  PUBLISH_COURSE: 'publish_course',
  UNPUBLISH_COURSE: 'unpublish_course',
  DELETE_COURSE: 'delete_course',
  CONFIRM_PAYMENT: 'confirm_payment',
  REFUND_PAYMENT: 'refund_payment',
  DELETE_USER: 'delete_user',
});

const AUDIT_ACTION_VALUES = Object.freeze(Object.values(AUDIT_ACTION));

module.exports = { AUDIT_ACTION, AUDIT_ACTION_VALUES };
