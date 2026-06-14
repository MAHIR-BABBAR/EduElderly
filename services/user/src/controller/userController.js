const { catchAsync, toPublicProfileDTO } = require('@eduelderly/shared');
const profileService = require('../services/profile.service');

const getUserProfile = catchAsync(async (req, res) => {
  const profile = await profileService.getProfileByUserId(req.user.userId);
  res.status(200).json({
    success: true,
    data: toPublicProfileDTO(profile),
  });
});

const updateUserProfile = catchAsync(async (req, res) => {
  const profile = await profileService.updateProfile(req.user.userId, req.body);
  res.status(200).json({
    success: true,
    data: toPublicProfileDTO(profile),
  });
});

const createUserProfile = catchAsync(async (req, res) => {
  const { profile, created } = await profileService.createProfile(req.body);
  res.status(created ? 201 : 200).json({
    success: true,
    message: created ? 'Profile created successfully' : undefined,
    data: toPublicProfileDTO(profile),
  });
});

const listUsers = catchAsync(async (req, res) => {
  const { users, pagination } = await profileService.listProfiles(req.query);
  res.status(200).json({
    success: true,
    data: {
      users: users.map(toPublicProfileDTO),
      pagination,
    },
  });
});

const getUserById = catchAsync(async (req, res) => {
  const profile = await profileService.getProfileByUserId(req.params.userId);
  res.status(200).json({
    success: true,
    data: toPublicProfileDTO(profile),
  });
});

const syncUserProfile = catchAsync(async (req, res) => {
  const profile = await profileService.syncProfile(req.body);
  res.status(200).json({
    success: true,
    data: toPublicProfileDTO(profile),
  });
});

const incrementUserXP = catchAsync(async (req, res) => {
  const profile = await profileService.incrementXP(req.params.userId, req.body.amount);
  res.status(200).json({
    success: true,
    data: toPublicProfileDTO(profile),
  });
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  createUserProfile,
  listUsers,
  getUserById,
  syncUserProfile,
  incrementUserXP,
};
