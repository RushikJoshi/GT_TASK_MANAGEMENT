const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/', taskController.getTasks);

// Only Admin/Manager can create tasks
router.post('/', authorizeRoles('admin', 'manager'), taskController.createTask);

// Any authenticated user can update status (Employee can ONLY update status)
router.put('/:taskId/status', taskController.updateTaskStatus);
router.put('/:id/status', taskController.updateTaskStatus);
router.put('/:id', authorizeRoles('admin', 'manager'), taskController.updateTask);
router.put('/:id/reassign', taskController.reassignTask);
router.delete('/:id', authorizeRoles('admin', 'manager'), taskController.deleteTask);

router.get('/:id', taskController.getTaskById);
router.post('/:id/comments', taskController.addComment);
router.post('/:id/attachments', taskController.addAttachment);

module.exports = router;
