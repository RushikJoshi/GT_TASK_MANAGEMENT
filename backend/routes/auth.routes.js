const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

/*
 * PHASE 5 EXPLANATIONS:
 *
 * - Why public signup is removed:
 *   Removing the registration endpoint prevents unauthorized individuals from accessing the application. All users must be explicitly provisioned by the Admin.
 */

// Middleware to attach loginType to body
const setLoginType = (type) => (req, res, next) => {
    req.body.loginType = type;
    next();
};

// Unified login route — auto-detects role from DB, no loginType enforcement
router.post('/login', authController.login);

// Legacy role-specific routes kept for backward compatibility
router.post('/admin-login', setLoginType('admin'), authController.login);
router.post('/manager-login', setLoginType('manager'), authController.login);
router.post('/employee-login', setLoginType('employee'), authController.login);
router.get('/profile', protect, authController.getProfile);
router.put('/update-profile', protect, authController.updateProfile);

module.exports = router;
