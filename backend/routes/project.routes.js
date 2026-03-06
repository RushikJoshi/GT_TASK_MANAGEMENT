const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(authenticateToken); // Protect all project routes

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.get('/:id/workflow', projectController.getWorkflow); // accessible to all authenticated users

// Only Admin/Manager can create projects or add members
router.post('/', authorizeRoles('admin', 'manager'), projectController.createProject);
router.put('/:id', authorizeRoles('admin', 'manager'), projectController.updateProject);
router.post('/:projectId/members', authorizeRoles('admin', 'manager'), projectController.addMember);
router.put('/:id/workflow', authorizeRoles('admin', 'manager'), projectController.updateWorkflow);

// Provide alias endpoint to create a task immediately linked to a project
const taskController = require('../controllers/task.controller');
router.post('/:projectId/tasks', authorizeRoles('admin', 'manager'), taskController.createTask);

module.exports = router;
