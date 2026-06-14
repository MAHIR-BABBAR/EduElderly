const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  publishCourse,
  deleteCourse,
} = require('../controllers/courseController');
const {
  paginationRules,
  createCourseRules,
  updateCourseRules,
  courseIdRules,
  publishRules,
} = require('../validators/courseValidators');

const router = express.Router();

router.get('/', paginationRules, listCourses);
router.post('/', extractUser, requireAdmin, createCourseRules, createCourse);
router.get('/:courseId', courseIdRules, getCourse);
router.put('/:courseId', extractUser, requireAdmin, updateCourseRules, updateCourse);
router.patch('/:courseId/publish', extractUser, requireAdmin, publishRules, publishCourse);
router.delete('/:courseId', extractUser, requireAdmin, courseIdRules, deleteCourse);

module.exports = router;
