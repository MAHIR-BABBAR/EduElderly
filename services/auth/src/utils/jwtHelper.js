const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ─── Access Token ────────────────────────────────────────────────────────────

const signAccessToken = (payload) => {
    if (!payload.userId || !payload.role) {
        throw new AppError('signAccessToken requires userId and role', 400, ERROR_CODES.E_INTERNAL);
    }
    return jwt.sign(
        { userId: payload.userId, role: payload.role },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
            issuer: 'eduelderly',
            audience: 'eduelderly-client',
        }
    );
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
        issuer: 'eduelderly',
        audience: 'eduelderly-client',
    });
};

// ─── Refresh Token ───────────────────────────────────────────────────────────

const signRefreshToken = (userId) => {
    if (!userId) throw new AppError('signRefreshToken requires userId', 400, ERROR_CODES.E_INTERNAL);

    const rawToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
            issuer: 'eduelderly',
        }
    );

    const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

    return { rawToken, tokenHash };
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: 'eduelderly',
    });
};

const hashRefreshToken = (rawToken) => {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
};

// ─── Email Verification Token ────────────────────────────────────────────────

/**
 * Signs a short-lived JWT for email verification links.
 * Contains userId and email so we can verify both on the receiving end.
 */
const signEmailVerificationToken = (userId, email) => {
    if (!userId || !email) {
        throw new AppError('signEmailVerificationToken requires userId and email', 400, ERROR_CODES.E_INTERNAL);
    }
    return jwt.sign(
        { userId, email, purpose: 'email-verification' },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: '24h', // Verification link valid for 24 hours
            issuer: 'eduelderly',
        }
    );
};

const verifyEmailVerificationToken = (token) => {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
        issuer: 'eduelderly',
    });
    if (decoded.purpose !== 'email-verification') {
        throw new Error('Invalid token purpose');
    }
    return decoded;
};

// ─── Password Reset Token ────────────────────────────────────────────────────

/**
 * Signs a short-lived JWT for password reset links.
 * Contains userId and email so we can verify both on the receiving end.
 */
const signPasswordResetToken = (userId, email) => {
    if (!userId || !email) {
        throw new AppError('signPasswordResetToken requires userId and email', 400, ERROR_CODES.E_INTERNAL);
    }
    return jwt.sign(
        { userId, email, purpose: 'password-reset' },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: '1h', // Reset link valid for 1 hour
            issuer: 'eduelderly',
        }
    );
};

const verifyPasswordResetToken = (token) => {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
        issuer: 'eduelderly',
    });
    if (decoded.purpose !== 'password-reset') {
        throw new Error('Invalid token purpose');
    }
    return decoded;
};

module.exports = {
    signAccessToken,
    verifyAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
    signEmailVerificationToken,
    verifyEmailVerificationToken,
    signPasswordResetToken,
    verifyPasswordResetToken,
};