const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken); // Protect all notification routes

router.get('/', notificationController.getNotifications);
router.post('/', notificationController.createNotification);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
