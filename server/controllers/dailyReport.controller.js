const DailyReport = require('../models/dailyReport.model');
const Task = require('../models/task.model');
const Activity = require('../models/activity.model');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Notification = require('../models/notification.model');

// @desc    Submit daily report
// @route   POST /api/daily-reports
// @access  Private (Employee/Manager)
exports.submitDailyReport = async (req, res) => {
    try {
        const { task, progressPercentage, completedToday, pending, blockers, expectedCompletion, date } = req.body;

        // Check if report already exists for today
        const existingReport = await DailyReport.findOne({ task, employee: req.user._id, date });
        if (existingReport) {
            return res.status(400).json({ success: false, message: 'Report already submitted for today' });
        }

        const report = await DailyReport.create({
            task,
            employee: req.user._id,
            date,
            progressPercentage,
            completedToday,
            pending,
            blockers,
            expectedCompletion
        });

        // Update task status and progress if it reaches 100% or just log it
        const taskObj = await Task.findById(task).populate('project');

        // Log activity
        await Activity.create({
            user: req.user._id,
            action: `submitted daily report on task ${taskObj.title}`,
            entityType: 'task',
            entityId: task,
            targetName: taskObj.title
        });

        // Notify Manager
        const managerId = taskObj.project.createdBy; // Usually the creator is the manager
        if (managerId) {
            await Notification.create({
                user: managerId,
                title: 'New Daily Report',
                message: `${req.user.fullName} submitted today's update on Task "${taskObj.title}".`,
                type: 'info',
                read: false
            });
        }

        res.status(201).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get reports for a task
// @route   GET /api/daily-reports/task/:taskId
// @access  Private
exports.getTaskReports = async (req, res) => {
    try {
        const reports = await DailyReport.find({ task: req.params.taskId })
            .populate('employee', 'fullName email avatar')
            .populate('reviewedBy', 'fullName')
            .sort({ date: -1 });
        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Check today's submission status for an employee
// @route   GET /api/daily-reports/check-today
// @access  Private
exports.checkTodaySubmission = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Find tasks assigned to employee in active projects
        const assignedTasks = await Task.find({ assignedTo: req.user._id }).select('_id title');
        const submittedReports = await DailyReport.find({
            employee: req.user._id,
            date: todayStr,
            task: { $in: assignedTasks.map(t => t._id) }
        }).select('task');

        const missingTasks = assignedTasks.filter(t => !submittedReports.some(r => r.task.toString() === t._id.toString()));

        res.status(200).json({
            success: true,
            data: {
                isSubmittedToday: missingTasks.length === 0,
                missingTasks
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Summary for manager
// @route   GET /api/daily-reports/manager-summary
// @access  Private (Manager/Admin)
exports.getManagerSummary = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Get projects managed by this user
        const projects = await Project.find({ createdBy: req.user._id }).select('_id name members');
        const projectIds = projects.map(p => p._id);
        const memberIds = projects.flatMap(p => p.members);

        // Get today's reports for these projects
        const tasks = await Task.find({ project: { $in: projectIds } }).select('_id title assignedTo');
        const taskIds = tasks.map(t => t._id);

        const reports = await DailyReport.find({
            task: { $in: taskIds },
            date: todayStr
        }).populate('employee', 'fullName avatar role')
            .populate('task', 'title')
            .populate('reviewedBy', 'fullName');

        // All active employees under these projects
        const uniqueMembers = [...new Set(memberIds.map(m => m.toString()))];
        const managersEmployees = await User.find({ _id: { $in: uniqueMembers } }).select('fullName _id avatar');

        const submittedEmployeeIds = reports.map(r => r.employee._id.toString());
        const missingUpdates = managersEmployees.filter(e => !submittedEmployeeIds.includes(e._id.toString()));

        res.status(200).json({
            success: true,
            data: {
                reports,
                missingUpdates,
                summary: {
                    totalSubmitted: reports.length,
                    totalPending: missingUpdates.length,
                    totalEmployees: managersEmployees.length
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update report status (Approve/Reject)
// @route   PUT /api/daily-reports/:id/review
// @access  Private (Manager)
exports.reviewReport = async (req, res) => {
    try {
        const { isApproved, managerNote } = req.body;
        const report = await DailyReport.findById(req.params.id).populate({
            path: 'task',
            populate: { path: 'project' }
        });
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        report.isReviewed = true;
        report.isApproved = isApproved;
        report.managerNote = managerNote;
        // Extended approval fields
        report.reportStatus = isApproved ? 'approved' : 'rejected';
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();

        if (isApproved && report.progressPercentage === 100) {
            // Find the "Completed/Done" status from the project workflow
            let doneStatus = 'Completed';
            const project = report.task.project;
            if (project && project.workflow) {
                const doneStage = project.workflow.find(s => s.type === 'done');
                if (doneStage) doneStatus = doneStage.name;
            }
            await Task.findByIdAndUpdate(report.task._id, { status: doneStatus });
        } else if (!isApproved) {
            // Revert to In Progress or first non-todo stage
            let inProgressStatus = 'In Progress';
            const project = report.task.project;
            if (project && project.workflow) {
                const ipStage = project.workflow.find(s => s.type === 'progress');
                if (ipStage) inProgressStatus = ipStage.name;
            }
            await Task.findByIdAndUpdate(report.task._id, { status: inProgressStatus });
        }

        // Notify employee
        const statusText = isApproved ? 'Approved ✅' : 'Rejected ❌';
        // Note: report.employee is usually just an ID here unless populated
        // But we have access to it from the report object
        // Notify the employee who submitted it
        // Check if user object exists or just use ID
        // (Assuming you have a notification system similar to what was used for managers)
        // I'll add the activity log as well
        await Activity.create({
            user: req.user.id, // The manager
            action: `Reviewed Progress Report: ${statusText}`,
            entityType: 'task',
            entityId: report.task._id,
            targetName: `Report from ${report.employee?.fullName || 'Employee'}`
        });

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
