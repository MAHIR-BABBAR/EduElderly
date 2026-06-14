const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const {
  createCategoryRules,
  updateCategoryRules,
  categoryIdRules,
} = require('../validators/courseValidators');

const router = express.Router();

router.get('/', listCategories);
router.post('/', extractUser, requireAdmin, createCategoryRules, createCategory);
router.put('/:categoryId', extractUser, requireAdmin, updateCategoryRules, updateCategory);
router.delete('/:categoryId', extractUser, requireAdmin, categoryIdRules, deleteCategory);

module.exports = router;
