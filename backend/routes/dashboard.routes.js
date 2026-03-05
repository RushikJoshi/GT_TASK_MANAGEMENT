const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/stats', protect, dashboardController.getDashboardStats);
router.get('/projects', protect, dashboardController.getActiveProjects);
router.get('/activity', protect, dashboardController.getRecentActivity);
router.get('/my-tasks/:userId', protect, dashboardController.getMyTasks);

module.exports = router;
