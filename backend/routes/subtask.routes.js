const express = require('express');
const router = express.Router();
const subtaskController = require('../controllers/subtask.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/task/:taskId', subtaskController.getSubtasksByTask);
router.post('/', subtaskController.createSubtask);
router.put('/:id', subtaskController.updateSubtask);
router.delete('/:id', subtaskController.deleteSubtask);
router.post('/reorder', subtaskController.reorderSubtasks);

module.exports = router;
