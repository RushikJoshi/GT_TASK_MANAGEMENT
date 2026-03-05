const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReport.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(authenticateToken); // Protect all routes

router.post('/', dailyReportController.submitDailyReport);
router.get('/task/:taskId', dailyReportController.getTaskReports);
router.get('/check-today', dailyReportController.checkTodaySubmission);
router.get('/manager-summary', authorizeRoles('admin', 'manager'), dailyReportController.getManagerSummary);
router.put('/:id/review', authorizeRoles('admin', 'manager'), dailyReportController.reviewReport);

module.exports = router;
