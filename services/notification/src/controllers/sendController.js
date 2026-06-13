const { AppError, ERROR_CODES, catchAsync } = require('@eduelderly/shared');
const { sendTransactionalEmail } = require('../clients/brevoClient');
const { VALID_TYPES, renderAuthEmail } = require('../templates/authTemplates');

const sendInternalEmail = catchAsync(async (req, res) => {
  const { email, type, templateData } = req.body;

  if (!email || !type) {
    throw new AppError('email and type are required', 400, ERROR_CODES.E_VALIDATION);
  }

  if (!VALID_TYPES.includes(type)) {
    throw new AppError('Invalid email type', 400, ERROR_CODES.E_VALIDATION);
  }

  if (type === 'otp' && !templateData?.otp) {
    throw new AppError('templateData.otp is required for otp emails', 400, ERROR_CODES.E_VALIDATION);
  }

  if ((type === 'email_verification' || type === 'password_reset') && !templateData?.link) {
    throw new AppError('templateData.link is required for link emails', 400, ERROR_CODES.E_VALIDATION);
  }

  const { subject, htmlContent, textContent } = renderAuthEmail(type, templateData);

  await sendTransactionalEmail({
    to: email,
    subject,
    htmlContent,
    textContent,
  });

  res.status(200).json({
    success: true,
    message: 'Email sent',
  });
});

module.exports = { sendInternalEmail };
