const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const {
  listModules,
  createModule,
  updateModule,
  deleteModule,
} = require('../controllers/moduleController');
const {
  createModuleRules,
  updateModuleRules,
  courseIdRules,
  moduleIdRules,
} = require('../validators/courseValidators');

const router = express.Router();

router.get('/:courseId/modules', courseIdRules, listModules);
router.post('/:courseId/modules', extractUser, requireAdmin, createModuleRules, createModule);
router.put('/modules/:moduleId', extractUser, requireAdmin, updateModuleRules, updateModule);
router.delete('/modules/:moduleId', extractUser, requireAdmin, moduleIdRules, deleteModule);

module.exports = router;
