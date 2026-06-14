const mongoose = require('mongoose');
const { ROLES } = require('@eduelderly/shared/constants/roles');

const UserProfileSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'userId is required'],
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
        index: true,
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.LEARNER,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    avatarUrl: {
        type: String,
        default: null,
        validate: {
            validator: (v) => !v || v.startsWith('https://'),
            message: 'avatarUrl must be HTTPS',
        },
    },
    fontSizePref: {
        type: String,
        enum: ['default', 'large', 'xl', 'huge'],
        default: 'large',
    },
    highContrast: {
        type: Boolean,
        default: false,
    },
    lang: {
        type: String,
        default: 'en',
        enum: ['en'],
    },
    totalXP: {
        type: Number,
        default: 0,
        min: [0, 'XP cannot be negative'],
    },
    bio: {
        type: String,
        default: '',
        maxlength: [300, 'Bio max 300 characters'],
        trim: true,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret.__v;
            delete ret._id;
            return ret;
        },
    },
});

UserProfileSchema.index({ name: 'text', email: 'text' });
UserProfileSchema.index({ totalXP: -1 });

const UserProfile = mongoose.model('UserProfile', UserProfileSchema);
module.exports = { UserProfile };
