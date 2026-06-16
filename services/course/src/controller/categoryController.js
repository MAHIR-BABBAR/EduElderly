const { catchAsync } = require('@eduelderly/shared');
const categoryService = require('../services/category.service');

const listCategories = catchAsync(async (_req, res) => {
  const categories = await categoryService.listCategories();
  res.status(200).json({ success: true, data: categories });
});

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.categoryId, req.body);
  res.status(200).json({ success: true, data: category });
});

const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.params.categoryId);
  res.status(200).json({ success: true, message: 'Category deleted' });
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
