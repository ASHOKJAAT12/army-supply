const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * Generate a signed JWT for a user.
 */
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

/**
 * Build a safe user response object (no password).
 */
const userResponse = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    createdAt: user.createdAt,
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
    try {
        // Validate request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
            });
        }

        const { name, email, mobile, password, role } = req.body;

        const user = await User.create({ name, email, mobile, password, role });
        const token = signToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user: userResponse(user), token },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
            });
        }

        const { email, password } = req.body;

        // Explicitly select password for comparison
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        const token = signToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user: userResponse(user), token },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json({
        success: true,
        data: { user: userResponse(req.user) },
    });
};

module.exports = { register, login, getMe };
