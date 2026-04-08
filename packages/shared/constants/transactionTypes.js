const TX_STATUS = Object.freeze({
  PENDING:       'pending',
  SUCCESS:       'success',
  FAILED:        'failed',
  REFUNDED:      'refunded',
  FRAUD_ATTEMPT: 'fraud_attempt',
});

const TX_TYPE = Object.freeze({
  PURCHASE:     'purchase',
  REFUND:       'refund',
  FREE_ENROLL:  'free_enroll',
});

module.exports = { TX_STATUS, TX_TYPE };