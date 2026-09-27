const { Quiz } = require('../models/Quiz');
const { Attempt } = require('../models/Attempt');

const getCourseQuizEligibility = async (userId, courseId) => {
  const quizzes = await Quiz.find({ courseId, isPublished: true }).sort({ createdAt: 1 });
  const results = await Promise.all(
    quizzes.map(async (quiz) => {
      const passed = await Attempt.findOne({ userId, quizId: quiz.quizId, passed: true });
      return {
        quizId: quiz.quizId,
        title: quiz.title,
        passed: Boolean(passed),
      };
    }),
  );

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = results.length === 0 || results.every((r) => r.passed);

  return {
    allPassed,
    totalQuizzes: results.length,
    passedCount,
    quizzes: results,
  };
};

module.exports = { getCourseQuizEligibility };
