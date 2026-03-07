const Task = require('../models/task.model');
const Project = require('../models/project.model');

// Helper to update project progress
const updateProjectProgress = async (projectId) => {
    try {
        const project = await Project.findById(projectId);
        if (!project) return;

        const tasks = await Task.find({ project: projectId });
        if (tasks.length === 0) {
            project.progress = 0;
            await project.save();
            return;
        }

        const doneStatuses = project.workflow.filter(w => w.type === 'done').map(w => w.name);
        if (doneStatuses.length === 0) doneStatuses.push('Completed', 'Done');

        const completedTasks = tasks.filter(t => doneStatuses.includes(t.status));
        const progress = Math.round((completedTasks.length / tasks.length) * 100);

        project.progress = progress;

        // Auto-update project status if 100%
        if (progress === 100) {
            project.status = 'Completed';
        } else if (progress > 0 && project.status === 'Needs Start' || project.status === 'To Do') {
            project.status = 'In Progress';
        }

        await project.save();
    } catch (err) {
        console.error('Error updating project progress:', err);
    }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (Admin/Manager only)
exports.createTask = async (req, res) => {
    try {
        const { title, description, priority, dueDate, project, assignedTo, status } = req.body;
        const projectId = req.params.projectId || project;

        const task = await Task.create({
            title, description, priority, dueDate, project: projectId, assignedTo,
            status: status || 'Todo',
            createdBy: req.user._id
        });

        // Log activity
        const Activity = require('../models/activity.model');
        await Activity.create({
            user: req.user._id,
            action: 'created task',
            entityType: 'task',
            entityId: task._id,
            targetName: task.title
        });

        // Add Notification for assigned user
        if (assignedTo) {
            const Notification = require('../models/notification.model');
            await Notification.create({
                user: assignedTo,
                title: 'New Task Assigned',
                message: `You have been assigned a new task: "${task.title}".`,
                type: 'task'
            });
        }

        // Update progress
        await updateProjectProgress(projectId);

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a task (General updates)
// @route   PUT /api/tasks/:id
// @access  Private (Admin/Manager/Assignee)
exports.updateTask = async (req, res) => {
    try {
        const { title, description, priority, dueDate, assignedTo, status } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        // Detection logic
        const oldDueDate = task.dueDate;
        const oldAssignedTo = task.assignedTo?.toString();
        const Notification = require('../models/notification.model');

        // Fields permitted to update
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (priority !== undefined) task.priority = priority;
        if (dueDate !== undefined) task.dueDate = dueDate;
        if (assignedTo !== undefined) task.assignedTo = assignedTo;
        if (status !== undefined) task.status = status;

        await task.save();

        // Check for Assignment Change
        if (assignedTo && assignedTo !== oldAssignedTo) {
            await Notification.create({
                user: assignedTo,
                title: 'New Task Assigned',
                message: `You have been assigned the task: "${task.title}".`,
                type: 'task'
            });
        }

        // Check for Deadline Change (Only if someone is assigned)
        if (dueDate && dueDate !== oldDueDate && task.assignedTo) {
            // Only notify if someone else made the change
            if (req.user._id.toString() !== task.assignedTo.toString()) {
                await Notification.create({
                    user: task.assignedTo,
                    title: 'Deadline Changed',
                    message: `The deadline for task "${task.title}" has been updated to ${new Date(dueDate).toLocaleDateString()}.`,
                    type: 'task'
                });
            }
        }

        // Log activity
        const Activity = require('../models/activity.model');
        await Activity.create({
            user: req.user._id,
            action: 'updated task details',
            entityType: 'task',
            entityId: task._id,
            targetName: task.title
        });

        // Update progress if status changed
        if (status !== undefined) {
            await updateProjectProgress(task.project);
        }

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update task status
// @route   PUT /api/tasks/:taskId/status
// @access  Private (All roles)
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const taskId = req.params.taskId || req.params.id;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        task.status = status;
        await task.save();

        // Log activity
        const Activity = require('../models/activity.model');
        await Activity.create({
            user: req.user._id,
            action: `changed task status to ${status}`,
            entityType: 'task',
            entityId: task._id,
            targetName: task.title
        });

        // Add Notification
        const Notification = require('../models/notification.model');
        if (req.user._id.toString() !== task.createdBy.toString() && (status === 'Review' || status === 'Done' || status === 'Completed')) {
            await Notification.create({
                user: task.createdBy,
                title: `Task Status Update`,
                message: `${req.user.fullName || 'A team member'} marked "${task.title}" as ${status}.`,
                type: 'task'
            });
        }

        // Update progress
        await updateProjectProgress(task.project);

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'employee') {
            filter = { assignedTo: req.user._id };
        }
        if (req.query.projectId) {
            filter.project = req.query.projectId;
        }
        const tasks = await Task.find(filter).populate('project assignedTo createdBy');
        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('project', 'name workflow')
            .populate('assignedTo', 'fullName email _id')
            .populate('createdBy', 'fullName email')
            .populate('comments.user', 'fullName email avatar');

        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        task.comments.push({
            user: req.user._id,
            text
        });
        await task.save();

        // Log activity
        const Activity = require('../models/activity.model');
        await Activity.create({
            user: req.user._id,
            action: 'added a comment to task',
            entityType: 'task',
            entityId: task._id,
            targetName: task.title
        });

        // Add Notification
        const Notification = require('../models/notification.model');
        if (req.user._id.toString() !== task.createdBy.toString()) {
            await Notification.create({
                user: task.createdBy,
                title: `New Comment on Task`,
                message: `${req.user.fullName || 'A team member'} commented on "${task.title}".`,
                type: 'task'
            });
        }

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin/Manager only)
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        const projectId = task.project;
        await Task.findByIdAndDelete(req.params.id);

        await updateProjectProgress(projectId);

        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
