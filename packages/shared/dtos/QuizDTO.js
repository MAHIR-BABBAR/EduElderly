/**
 * @param {Object} questionDoc - Mongoose Question document or plain object
 * @returns {Object} Public question shape — no correctIndex
 */
const toPublicQuestionDTO = (questionDoc) => {
  const question = questionDoc.toObject ? questionDoc.toObject() : { ...questionDoc };
  return {
    questionId: question.questionId || question._id?.toString(),
    quizId: question.quizId,
    prompt: question.prompt,
    options: question.options || [],
    order: question.order,
  };
};

/**
 * @param {Object} quizDoc - Mongoose Quiz document or plain object
 * @param {Object[]} questionDocs - Question documents for this quiz
 * @returns {Object} Public quiz with questions — no correctIndex
 */
const toPublicQuizDTO = (quizDoc, questionDocs = []) => {
  const quiz = quizDoc.toObject ? quizDoc.toObject() : { ...quizDoc };
  return {
    quizId: quiz.quizId || quiz._id?.toString(),
    courseId: quiz.courseId,
    moduleId: quiz.moduleId ?? null,
    title: quiz.title,
    passThreshold: quiz.passThreshold,
    maxAttempts: quiz.maxAttempts,
    isPublished: quiz.isPublished,
    questions: questionDocs.map(toPublicQuestionDTO),
  };
};

/**
 * @param {Object} attemptDoc - Mongoose Attempt document or plain object
 * @param {Object[]} [questionFeedback] - [{ questionId, correct }]
 * @returns {Object} Attempt result after submit
 */
const toAttemptResultDTO = (attemptDoc, questionFeedback = []) => {
  const attempt = attemptDoc.toObject ? attemptDoc.toObject() : { ...attemptDoc };
  return {
    attemptId: attempt.attemptId || attempt._id?.toString(),
    quizId: attempt.quizId,
    score: attempt.score,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
    questionFeedback,
  };
};

/**
 * @param {Object} attemptDoc - Mongoose Attempt document or plain object
 * @returns {Object} Summary for attempt listings
 */
const toAttemptSummaryDTO = (attemptDoc) => {
  const attempt = attemptDoc.toObject ? attemptDoc.toObject() : { ...attemptDoc };
  return {
    attemptId: attempt.attemptId || attempt._id?.toString(),
    quizId: attempt.quizId,
    score: attempt.score,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
  };
};

module.exports = {
  toPublicQuestionDTO,
  toPublicQuizDTO,
  toAttemptResultDTO,
  toAttemptSummaryDTO,
};
