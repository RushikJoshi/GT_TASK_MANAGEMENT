const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Activity = require('../models/activity.model');
const User = require('../models/user.model');

// 1. Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalProjects = await Project.countDocuments();
        const activeTasks = await Task.countDocuments({ status: { $ne: 'Done' } });
        const completedTasks = await Task.countDocuments({ status: 'Done' });
        const teamMembers = await User.countDocuments();

        return res.status(200).json({
            success: true,
            message: 'Dashboard stats fetched successfully',
            data: {
                totalProjects,
                activeTasks,
                completedTasks,
                teamMembers
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// 2. Get Active Projects (last 3)
exports.getActiveProjects = async (req, res) => {
    try {
        const projects = await Project.find({ status: { $ne: 'Completed' } })
            .sort({ updatedAt: -1 })
            .limit(3)
            .populate('members', 'avatar name')
            .select('name status deadline progress members');

        return res.status(200).json({
            success: true,
            message: 'Active projects fetched successfully',
            data: projects
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// 3. Get Recent Activity
exports.getRecentActivity = async (req, res) => {
    try {
        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'name avatar')
            .select('user action entityType entityId targetName createdAt');

        return res.status(200).json({
            success: true,
            message: 'Recent activity fetched successfully',
            data: activities
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// 4. Get My Tasks - User specific
exports.getMyTasks = async (req, res) => {
    try {
        const { userId } = req.params;
        const tasks = await Task.find({ assignedTo: userId })
            .sort({ dueDate: 1 }) // sort ascending
            .select('title priority status dueDate project')
            .populate('project', 'name');

        return res.status(200).json({
            success: true,
            message: 'User tasks fetched successfully',
            data: tasks
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};
