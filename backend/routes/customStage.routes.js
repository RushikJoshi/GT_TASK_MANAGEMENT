const express = require('express');
const router = express.Router();
const customStageController = require('../controllers/customStage.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/task/:taskId', customStageController.getCustomStagesByTask);
router.post('/', customStageController.createCustomStage);
router.put('/:id', customStageController.updateCustomStage);
router.delete('/:id', customStageController.deleteCustomStage);
router.post('/reorder', customStageController.reorderCustomStages);

module.exports = router;
