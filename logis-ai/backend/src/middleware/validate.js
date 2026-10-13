const { body } = require('express-validator');

const registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('mobile')
        .matches(/^\d{10}$/)
        .withMessage('Mobile must be 10 digits'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    body('role')
        .optional()
        .isIn(['admin', 'operator', 'viewer'])
        .withMessage("Role must be admin, operator, or viewer"),
];

const loginValidation = [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { registerValidation, loginValidation };
