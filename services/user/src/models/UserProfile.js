const UserProfileSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'userId is required'],
        unique: true,
        index: true,
        // UUID string from auth-service — the cross-service link
    },
    avatarUrl: {
        type: String,
        default: null,   // null = show initials avatar in UI
        validate: {
            validator: (v) => !v || v.startsWith('https://'),
            message: 'avatarUrl must be HTTPS',
        },
    },
    fontSizePref: {
        type: String,
        enum: ['default', 'large', 'xl', 'huge'],
        default: 'large',  // 18px default — accessibility-first for elderly
    },
    highContrast: {
        type: Boolean,
        default: false,
    },
    lang: {
        type: String,
        default: 'en',
        enum: ['en'],   // v1 English only — extend enum in v2
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

// Full-text search for admin user listing (name + email)
UserProfileSchema.index({ name: 'text', email: 'text' });
// Sort by XP for leaderboard queries
UserProfileSchema.index({ totalXP: -1 });

const UserProfile = mongoose.model('UserProfile', UserProfileSchema);
module.exports = { UserProfile };