const Subtask = require('../models/subtask.model');

exports.getSubtasksByTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const subtasks = await Subtask.find({ parentTask: taskId })
            .populate('customStageRef')
            .populate('employee', 'fullName email')
            .sort('orderIndex');
        res.status(200).json({ success: true, data: subtasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createSubtask = async (req, res) => {
    try {
        const { parentTaskId, title, description, stage, stageColor, stageType, customStageRef, priority, dueDate, orderIndex } = req.body;
        const subtask = await Subtask.create({
            parentTask: parentTaskId,
            employee: req.user._id,
            title,
            description,
            stage,
            stageColor,
            stageType,
            customStageRef,
            priority,
            dueDate,
            orderIndex
        });
        res.status(201).json({ success: true, data: subtask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSubtask = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const subtask = await Subtask.findByIdAndUpdate(id, updateData, { new: true })
            .populate('customStageRef')
            .populate('employee', 'fullName email');
        res.status(200).json({ success: true, data: subtask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteSubtask = async (req, res) => {
    try {
        const { id } = req.params;
        await Subtask.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Subtask deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.reorderSubtasks = async (req, res) => {
    try {
        const { subtasks } = req.body; // Array of { id, orderIndex }
        for (let item of subtasks) {
            await Subtask.findByIdAndUpdate(item.id, { orderIndex: item.orderIndex });
        }
        res.status(200).json({ success: true, message: 'Subtasks reordered' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
