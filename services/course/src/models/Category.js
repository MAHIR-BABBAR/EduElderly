const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  categoryId: {
    type: String,
    default: uuidv7,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
    trim: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.__v;
      delete ret._id;
      return ret;
    },
  },
});

const Category = mongoose.model('Category', CategorySchema);
module.exports = { Category };
