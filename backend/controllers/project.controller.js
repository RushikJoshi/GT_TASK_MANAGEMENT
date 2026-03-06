const Project = require('../models/project.model');

// @desc    Create a project
// @route   POST /api/projects
// @access  Private (Admin/Manager only)
// EXPLANATION: We use RBAC to ensure employees cannot create projects.
exports.createProject = async (req, res) => {
    try {
        const { name, description, deadline, members, status, workflow } = req.body;
        const project = await Project.create({
            name,
            description,
            deadline,
            status: status || 'In Progress',
            members: members || [],
            createdBy: req.user._id,
            workflow: workflow || []
        });

        // Log activity
        const Activity = require('../models/activity.model');
        await Activity.create({
            user: req.user._id,
            action: 'created project',
            entityType: 'project',
            entityId: project._id,
            targetName: project.name
        });

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add member to a project
// @route   POST /api/projects/:projectId/members
// @access  Private (Admin/Manager only)
exports.addMember = async (req, res) => {
    try {
        const { memberId } = req.body;
        const project = await Project.findById(req.params.projectId);

        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (!project.members.includes(memberId)) {
            project.members.push(memberId);
            await project.save();
        }
        res.status(200).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
    try {
        // Employees might only see projects they are members of, but instructions didn't specify.
        // Assuming all authenticated users can see projects, or we can filter.
        let filter = {};
        if (req.user.role === 'employee') {
            filter = { members: req.user._id };
        }
        const projects = await Project.find(filter).populate('members', 'fullName email role').populate('createdBy', 'fullName email');
        res.status(200).json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('members', 'fullName email role avatar')
            .populate('createdBy', 'fullName email');

        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Get project workflow
// @route   GET /api/projects/:id/workflow
// @access  Private (all authenticated users)
exports.getWorkflow = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).select('workflow');
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.status(200).json({ success: true, data: project.workflow || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update project workflow
// @route   PUT /api/projects/:id/workflow
// @access  Private (Admin/Manager only)
exports.updateWorkflow = async (req, res) => {
    try {
        const { workflow } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        project.workflow = workflow;
        await project.save();

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Update project (name, description, deadline, status, members)
// @route   PUT /api/projects/:id
// @access  Private (Admin/Manager only)
exports.updateProject = async (req, res) => {
    try {
        const { name, description, deadline, status, members } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (name !== undefined) project.name = name;
        if (description !== undefined) project.description = description;
        if (deadline !== undefined) project.deadline = deadline;
        if (status !== undefined) project.status = status;
        if (members !== undefined) project.members = members;

        await project.save();
        await project.populate('members', 'fullName email role');

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
