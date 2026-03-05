const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

// Protect all admin routes and restrict to admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.post('/create-user', adminController.createUser);
router.get('/users', adminController.getUsers);
router.get('/managers', adminController.getManagers);
router.put('/users/:id', adminController.updateUser);

module.exports = router;
