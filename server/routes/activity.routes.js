const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/', activityController.getActivities);

module.exports = router;
