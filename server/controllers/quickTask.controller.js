const QuickTask = require('../models/quickTask.model');
const Notification = require('../models/notification.model');
const Activity = require('../models/activity.model');
const User = require('../models/user.model');

// ────────────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────────────
const buildFilter = (req) => {
    const filter = { isArchived: false };
    const { status, priority, category, assignedTo, dueDate, view } = req.query;

    // Role-based scoping
    if (req.user.role === 'employee') {
        filter.$or = [
            { createdBy: req.user._id },
            { assignedTo: req.user._id }
        ];
    }

    // View filters
    if (view === 'my') filter.createdBy = req.user._id;
    if (view === 'assigned') filter.assignedTo = req.user._id;
    if (view === 'upcoming') {
        const now = new Date();
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        filter.dueDate = { $gte: now, $lte: in7 };
        filter.status = { $ne: 'DONE' };
    }
    if (view === 'overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter.dueDate = { $lt: today };
        filter.status = { $ne: 'DONE' };
    }

    // Additional optional filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (dueDate) {
        const d = new Date(dueDate);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        filter.dueDate = { $gte: d, $lt: next };
    }

    return filter;
};

// ────────────────────────────────────────────────────────────────────────────
// CREATE
// ────────────────────────────────────────────────────────────────────────────
exports.createQuickTask = async (req, res) => {
    try {
        const {
            title, description, assignedTo, priority, status,
            category, dueDate, reminderTime, reminderType,
            repeatType, checklist, attachments
        } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        if (dueDate) {
            const date = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                return res.status(400).json({ success: false, message: 'Tasks cannot be created with past dates.' });
            }
        }

        const task = await QuickTask.create({
            title: title.trim(),
            description: description || '',
            createdBy: req.user._id,
            assignedTo: assignedTo || null,
            priority: priority || 'MEDIUM',
            status: status || 'TODO',
            category: category || 'Internal Task',
            dueDate: dueDate || null,
            reminderTime: reminderTime || null,
            reminderType: reminderType || 'None',
            repeatType: repeatType || 'NONE',
            checklist: checklist || [],
            attachments: attachments || []
        });

        // Notify assigned user (if not self)
        if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
            await Notification.create({
                user: assignedTo,
                title: 'Quick Task Assigned',
                message: `You have been assigned a quick task: "${task.title}".`,
                type: 'task'
            });
        }

        const populated = await QuickTask.findById(task._id)
            .populate('createdBy', 'fullName email avatar')
            .populate('assignedTo', 'fullName email avatar');

        return res.status(201).json({ success: true, message: 'Quick task created', data: populated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// GET ALL
// ────────────────────────────────────────────────────────────────────────────
exports.getQuickTasks = async (req, res) => {
    try {
        const filter = buildFilter(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [tasks, total] = await Promise.all([
            QuickTask.find(filter)
                .populate('createdBy', 'fullName email avatar')
                .populate('assignedTo', 'fullName email avatar')
                .populate('comments.user', 'fullName email avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            QuickTask.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: tasks,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// GET ONE
// ────────────────────────────────────────────────────────────────────────────
exports.getQuickTaskById = async (req, res) => {
    try {
        const task = await QuickTask.findById(req.params.id)
            .populate('createdBy', 'fullName email avatar')
            .populate('assignedTo', 'fullName email avatar')
            .populate('comments.user', 'fullName email avatar')
            .populate('reassignmentHistory.previousAssignee', 'fullName')
            .populate('reassignmentHistory.newAssignee', 'fullName')
            .populate('reassignmentHistory.reassignedBy', 'fullName');

        if (!task) return res.status(404).json({ success: false, message: 'Quick task not found' });

        // Check access
        if (req.user.role === 'employee') {
            const isOwner = task.createdBy?._id?.toString() === req.user._id.toString();
            const isAssignee = task.assignedTo?._id?.toString() === req.user._id.toString();
            if (!isOwner && !isAssignee) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        return res.status(200).json({ success: true, data: task });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// UPDATE
// ────────────────────────────────────────────────────────────────────────────
exports.updateQuickTask = async (req, res) => {
    try {
        const task = await QuickTask.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Quick task not found' });

        // Only admin or task owner can edit
        const isOwner = task.createdBy?.toString() === req.user._id.toString();
        // if (req.user.role === 'employee' && !isOwner) {
        //     return res.status(403).json({ success: false, message: 'Only the task creator or admin can edit this task' });
        // }

        const allowed = [
            'title', 'description', 'assignedTo', 'priority', 'status',
            'category', 'dueDate', 'reminderTime', 'reminderType',
            'repeatType', 'checklist', 'attachments'
        ];

        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'dueDate' && req.body[field]) {
                    const date = new Date(req.body[field]);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    // Only validate if date is changed and it's not the same as before
                    if (date < today && (!task.dueDate || date.getTime() !== new Date(task.dueDate).getTime())) {
                        throw new Error('Tasks cannot be created with past dates.');
                    }
                }
                task[field] = req.body[field];
            }
        });

        // Reset reminderSent if reminderTime changed
        if (req.body.reminderTime !== undefined) {
            task.reminderSent = false;
        }

        await task.save();

        const updated = await QuickTask.findById(task._id)
            .populate('createdBy', 'fullName email avatar')
            .populate('assignedTo', 'fullName email avatar')
            .populate('comments.user', 'fullName email avatar');

        return res.status(200).json({ success: true, message: 'Quick task updated', data: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// DELETE
// ────────────────────────────────────────────────────────────────────────────
exports.deleteQuickTask = async (req, res) => {
    try {
        const task = await QuickTask.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Quick task not found' });

        // Admin can delete any; employee only their own
        const isOwner = task.createdBy?.toString() === req.user._id.toString();
        if (req.user.role === 'employee' && !isOwner) {
            return res.status(403).json({ success: false, message: 'You can only delete your own tasks' });
        }

        await QuickTask.findByIdAndDelete(task._id);
        return res.status(200).json({ success: true, message: 'Quick task deleted', data: { _id: task._id } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// ADD COMMENT
// ────────────────────────────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        const task = await QuickTask.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Quick task not found' });

        task.comments.push({ user: req.user._id, text: text.trim() });
        await task.save();

        const updated = await QuickTask.findById(task._id)
            .populate('comments.user', 'fullName email avatar');

        return res.status(201).json({ success: true, data: updated.comments });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// UPDATE CHECKLIST ITEM
// ────────────────────────────────────────────────────────────────────────────
exports.updateChecklistItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { completed } = req.body;

        const task = await QuickTask.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Quick task not found' });

        const item = task.checklist.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });

        item.completed = completed;
        await task.save();

        return res.status(200).json({ success: true, data: task.checklist });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// REASSIGN
// ────────────────────────────────────────────────────────────────────────────
exports.reassignQuickTask = async (req, res) => {
    try {
        const { newAssigneeId, reason } = req.body;
        if (!newAssigneeId) {
            return res.status(400).json({ success: false, message: 'New assignee is required' });
        }

        const task = await QuickTask.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Quick task not found' });

        if (task.status === 'DONE') {
            return res.status(400).json({ success: false, message: 'Cannot reassign a completed task' });
        }

        const oldAssigneeId = task.assignedTo;
        const oldUser = oldAssigneeId ? await User.findById(oldAssigneeId) : null;
        const newUser = await User.findById(newAssigneeId);

        if (!newUser) return res.status(404).json({ success: false, message: 'New assignee not found' });

        // Record history
        task.reassignmentHistory.push({
            previousAssignee: oldAssigneeId || null,
            newAssignee: newAssigneeId,
            reassignedBy: req.user._id,
            reason: reason || 'No reason provided',
            timestamp: new Date()
        });

        task.assignedTo = newAssigneeId;
        await task.save();

        // Activity Log
        await Activity.create({
            user: req.user._id,
            action: `reassigned task to ${newUser.fullName}`,
            entityType: 'task',
            entityId: task._id,
            targetName: task.title
        });

        // Notification to new assignee
        await Notification.create({
            user: newAssigneeId,
            title: 'Task Reassigned to You',
            message: `You have been reassigned the task: "${task.title}" by ${req.user.fullName}. Reason: ${reason || 'Not specified'}`,
            type: 'task'
        });

        const populated = await QuickTask.findById(task._id)
            .populate('createdBy', 'fullName email avatar')
            .populate('assignedTo', 'fullName email avatar')
            .populate('comments.user', 'fullName email avatar')
            .populate('reassignmentHistory.previousAssignee', 'fullName')
            .populate('reassignmentHistory.newAssignee', 'fullName')
            .populate('reassignmentHistory.reassignedBy', 'fullName');

        return res.status(200).json({ success: true, message: 'Task successfully reassigned.', data: populated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// GET STATS (for dashboard view counts)
// ────────────────────────────────────────────────────────────────────────────
exports.getQuickTaskStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const baseFilter = req.user.role === 'employee'
            ? { isArchived: false, $or: [{ createdBy: userId }, { assignedTo: userId }] }
            : { isArchived: false };

        const [total, myTasks, assigned, upcoming, overdue, todo, inProgress, done] = await Promise.all([
            QuickTask.countDocuments(baseFilter),
            QuickTask.countDocuments({ ...baseFilter, createdBy: userId }),
            QuickTask.countDocuments({ ...baseFilter, assignedTo: userId }),
            QuickTask.countDocuments({ ...baseFilter, dueDate: { $gte: now, $lte: in7 }, status: { $ne: 'DONE' } }),
            QuickTask.countDocuments({ ...baseFilter, dueDate: { $lt: today }, status: { $ne: 'DONE' } }),
            QuickTask.countDocuments({ ...baseFilter, status: 'TODO' }),
            QuickTask.countDocuments({ ...baseFilter, status: 'IN_PROGRESS' }),
            QuickTask.countDocuments({ ...baseFilter, status: 'DONE' }),
        ]);

        return res.status(200).json({
            success: true,
            data: { total, myTasks, assigned, upcoming, overdue, todo, inProgress, done }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
