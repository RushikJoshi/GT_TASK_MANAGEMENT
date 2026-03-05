const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quickTask.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Stats (must be before /:id to avoid conflict)
router.get('/stats', ctrl.getQuickTaskStats);

// Core CRUD
router.post('/', ctrl.createQuickTask);
router.get('/', ctrl.getQuickTasks);
router.get('/:id', ctrl.getQuickTaskById);
router.put('/:id', ctrl.updateQuickTask);
router.delete('/:id', ctrl.deleteQuickTask);

// Comments
router.post('/:id/comments', ctrl.addComment);

// Checklist item toggle
router.patch('/:id/checklist/:itemId', ctrl.updateChecklistItem);

module.exports = router;
