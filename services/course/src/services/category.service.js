const { Category } = require('../models/Category');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { slugify } = require('../utils/slug');

const listCategories = async () => Category.find().sort({ name: 1 });

const getCategoryById = async (categoryId) => {
  const category = await Category.findOne({ categoryId });
  if (!category) {
    throw new AppError('Category not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return category;
};

const createCategory = async ({ name, description }) => {
  const slug = slugify(name);
  const existing = await Category.findOne({ slug });
  if (existing) {
    throw new AppError('Category slug already exists', 400, ERROR_CODES.E_VALIDATION);
  }
  return Category.create({ name, slug, description });
};

const updateCategory = async (categoryId, { name, description }) => {
  const updates = {};
  if (name !== undefined) {
    updates.name = name;
    updates.slug = slugify(name);
  }
  if (description !== undefined) updates.description = description;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400, ERROR_CODES.E_VALIDATION);
  }

  if (updates.slug) {
    const conflict = await Category.findOne({ slug: updates.slug, categoryId: { $ne: categoryId } });
    if (conflict) {
      throw new AppError('Category slug already exists', 400, ERROR_CODES.E_VALIDATION);
    }
  }

  const category = await Category.findOneAndUpdate(
    { categoryId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!category) {
    throw new AppError('Category not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return category;
};

const deleteCategory = async (categoryId) => {
  const category = await Category.findOneAndDelete({ categoryId });
  if (!category) {
    throw new AppError('Category not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return category;
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
