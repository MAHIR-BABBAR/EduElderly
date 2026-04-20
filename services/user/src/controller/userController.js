
const { UserProfile } = require('../models/UserProfile');
const { ERROR_CODES, AppError } = require('@eduelderly/shared');

const getUserProfile = async (req, res) => {
    const profile = await UserProfile.findOne({userId:req.user.userId});
    if (!profile) {
        throw new AppError('User not found', 404, ERROR_CODES.E_NOT_FOUND);
    }
    res.status(200).json({
        success: true,
        data: profile
    })
}

const updateUserProfile = async (req, res) => {
    const { userId } = req.user;
    const allowedFields = ['avatarUrl', 'fontSizePref', 'highContrast', 'lang', 'bio'];
    const updates = {};
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    if (Object.keys(updates).length === 0) {
        throw new AppError('No updates provided', 400, ERROR_CODES.E_VALIDATION);
    }

    const profile = await UserProfile.findOneAndUpdate(
        { userId, isActive: true },
        { $set: updates },
        {
            new: true,
            runValidators: true,
        }
    )

    if (!profile) {
        throw new AppError('User not found', 404, ERROR_CODES.E_NOT_FOUND);
    }
    res.status(200).json({
        success: true,
        data: profile
    })
}

const createUserProfile = async (req, res) => {
    const { userId } = req.body;

    const existing = await UserProfile.findOne({userId});
    if (existing) {
        return res.status(200).json({
            success: true,
            data: { profile: existing }
        })
    }

    const userProfile = await UserProfile.create({ userId });
    res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: userProfile
    })
}

const listUsers = async (req, res) => {
    const users = await UserProfile.find();
    res.status(200).json({
        success: true,
        data: users
    })
}

const getUserById = async (req, res) => {
    const { userId } = req.params;
    const profile = await UserProfile.findOne({userId});
    if (!profile) {
        throw new AppError('User not found', 404, ERROR_CODES.E_NOT_FOUND);
    }
    res.status(200).json({
        success: true,
        data: profile
    })
}

