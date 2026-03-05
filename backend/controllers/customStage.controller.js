const CustomStage = require('../models/customStage.model');

exports.getCustomStagesByTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const stages = await CustomStage.find({ task: taskId }).sort('orderIndex');
        res.status(200).json({ success: true, data: stages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCustomStage = async (req, res) => {
    try {
        const { taskId, name, color, orderIndex } = req.body;
        const stage = await CustomStage.create({
            employee: req.user._id,
            task: taskId,
            name,
            color,
            orderIndex
        });
        res.status(201).json({ success: true, data: stage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCustomStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, orderIndex } = req.body;
        const stage = await CustomStage.findByIdAndUpdate(id, { name, color, orderIndex }, { new: true });
        res.status(200).json({ success: true, data: stage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCustomStage = async (req, res) => {
    try {
        const { id } = req.params;
        await CustomStage.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Stage deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.reorderCustomStages = async (req, res) => {
    try {
        const { stages } = req.body; // Array of { id, orderIndex }
        for (let item of stages) {
            await CustomStage.findByIdAndUpdate(item.id, { orderIndex: item.orderIndex });
        }
        res.status(200).json({ success: true, message: 'Stages reordered' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
