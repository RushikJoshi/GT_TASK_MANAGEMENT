const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

/*
 * PHASE 5 EXPLANATIONS:
 * 
 * - Why admin creates all users: 
 *   In enterprise software (like ClickUp/Jira), uncontrolled signups lead to security risks and unwanted accounts. Centralized administration ensures that only verified employees get access to the internal data.
 * 
 * - Why only admin can create manager/employee accounts: 
 *   To maintain strict hierarchical security. Managers shouldn't have the authority to create peers or other managers without administrative oversight.
 */

// @desc    Create a new user (Admin, Manager, Employee)
// @route   POST /api/admin/create-user
// @access  Private/Admin
exports.createUser = async (req, res) => {
    try {
        const { fullName, email, password, role, department, jobTitle, status, phone, employeeId, location, employmentType, reportingManager, skills, joiningDate } = req.body;

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Please provide required fields: fullName, email, password, role', data: null });
        }

        // Check user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists with this email', data: null });
        }

        // Validate Role (Ensure only valid roles are allowed)
        if (!['admin', 'manager', 'employee'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role specified', data: null });
        }

        // Handle auto-generation of Employee ID
        let generatedEmployeeId = employeeId;
        if (!generatedEmployeeId || generatedEmployeeId.trim() === '') {
            const count = await User.countDocuments();
            // Prefix padded with 0s like EMP-0001
            generatedEmployeeId = `EMP-${(count + 1).toString().padStart(4, '0')}`;
        } else {
            // Check if passed employeeId already exists
            const empIdExists = await User.findOne({ employeeId: generatedEmployeeId });
            if (empIdExists) {
                return res.status(400).json({ success: false, message: 'Employee ID already exists', data: null });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Parse optional schema fields safely
        const newUserData = {
            fullName,
            email,
            password: hashedPassword,
            employeeId: generatedEmployeeId,
            role,
            department: department || '',
            jobTitle: jobTitle || '',
            status: 'ACTIVE',
            phone: phone || '',
            location: location || '',
            employmentType: employmentType || 'Full-time',
            skills: skills || [],
            ...(joiningDate && { joiningDate }),
            ...(reportingManager && { reportingManager })
        };

        // Create user
        const user = await User.create(newUserData);

        if (user) {
            const userData = {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                employeeId: user.employeeId,
                role: user.role,
                department: user.department,
                jobTitle: user.jobTitle,
                status: user.status,
                phone: user.phone,
                location: user.location,
                employmentType: user.employmentType,
                joiningDate: user.joiningDate,
                skills: user.skills,
                createdAt: user.createdAt
            };

            return res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: userData
            });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid user data', data: null });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: users
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// @desc    Get managers (for dropdowns)
// @route   GET /api/admin/managers
// @access  Private/Admin
exports.getManagers = async (req, res) => {
    try {
        const managers = await User.find({ role: 'manager' }).select('fullName _id email');
        return res.status(200).json({
            success: true,
            data: managers
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const { fullName, email, role, department, status } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', data: null });
        }

        if (fullName) user.fullName = fullName;
        if (email) user.email = email;
        if (role) user.role = role;
        if (department) user.department = department;
        if (status) user.status = status;

        const updatedUser = await user.save();

        const userData = {
            _id: updatedUser._id,
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            employeeId: updatedUser.employeeId,
            role: updatedUser.role,
            department: updatedUser.department,
            jobTitle: updatedUser.jobTitle,
            status: updatedUser.status,
            phone: updatedUser.phone,
            location: updatedUser.location,
            employmentType: updatedUser.employmentType,
            joiningDate: updatedUser.joiningDate,
            skills: updatedUser.skills,
            createdAt: updatedUser.createdAt
        };

        return res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: userData
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// @desc    Disable / Enable a user (toggle ACTIVE <-> INACTIVE)
// @route   PATCH /api/admin/users/:id/disable
// @access  Private/Admin
exports.disableUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', data: null });
        }

        // Prevent admin from disabling themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot disable your own account', data: null });
        }

        user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await user.save();

        return res.status(200).json({
            success: true,
            message: `User ${user.status === 'ACTIVE' ? 'enabled' : 'disabled'} successfully`,
            data: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                status: user.status,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

// @desc    Delete a user completely
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', data: null });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account', data: null });
        }

        const Project = require('../models/project.model');
        const Task = require('../models/task.model');

        // 1. Remove user from project members arrays (safe: project stays intact)
        await Project.updateMany(
            { members: user._id },
            { $pull: { members: user._id } }
        );

        // 2. Nullify tasks assigned to the deleted user (task stays, assignment clears)
        await Task.updateMany(
            { assignedTo: user._id },
            { $unset: { assignedTo: '' } }
        );

        // 3. Nullify tasks created by the deleted user (task stays, creator clears)
        await Task.updateMany(
            { createdBy: user._id },
            { $unset: { createdBy: '' } }
        );

        // 4. Remove user's comments from tasks they commented on
        await Task.updateMany(
            { 'comments.user': user._id },
            { $pull: { comments: { user: user._id } } }
        );

        // 5. Finally delete the user
        await User.findByIdAndDelete(user._id);

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully and all references cleaned up',
            data: { _id: user._id }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};
