const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(authenticateToken); // Protect all project routes

router.get('/employees', authorizeRoles('admin', 'manager'), userController.getEmployees);
router.get('/assignable', userController.getAssignableUsers);

module.exports = router;
