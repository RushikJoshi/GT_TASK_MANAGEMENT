const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

// Protect all admin routes and restrict to admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.post('/create-user', adminController.createUser);
router.post('/bulk-create-users', adminController.bulkCreateUsers);
router.get('/users', adminController.getUsers);
router.get('/managers', adminController.getManagers);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/disable', adminController.disableUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
