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
            let nextId = 1;
            // Find the most recently created user that has an auto-generated EMP- pattern
            const lastUser = await User.findOne({ employeeId: /^EMP-\d+$/ }).sort({ _id: -1 });
            if (lastUser && lastUser.employeeId) {
                const numStr = lastUser.employeeId.replace('EMP-', '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num)) {
                    nextId = num + 1;
                }
            }

            // Ensure the generated ID is unique
            let isUnique = false;
            while (!isUnique) {
                generatedEmployeeId = `EMP-${nextId.toString().padStart(4, '0')}`;
                const existing = await User.findOne({ employeeId: generatedEmployeeId });
                if (existing) {
                    nextId++;
                } else {
                    isUnique = true;
                }
            }
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

// @desc    Bulk create users from Excel data
// @route   POST /api/admin/bulk-create-users
// @access  Private/Admin
exports.bulkCreateUsers = async (req, res) => {
    try {
        const { users } = req.body;
        if (!users || !Array.isArray(users)) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of users.' });
        }

        const results = { successful: 0, failed: 0, errors: [] };

        let nextId = 1;
        const lastUser = await User.findOne({ employeeId: /^EMP-\d+$/ }).sort({ _id: -1 });
        if (lastUser && lastUser.employeeId) {
            const numStr = lastUser.employeeId.replace('EMP-', '');
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) nextId = num + 1;
        }

        const salt = await bcrypt.genSalt(10);

        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            try {
                if (!u.fullName || !u.email || !u.role) {
                    throw new Error(`Row ${i + 1}: Missing required fields (fullName, email, role)`);
                }

                const userExists = await User.findOne({ email: u.email });
                if (userExists) {
                    throw new Error(`Row ${i + 1}: User already exists with email ${u.email}`);
                }

                let generatedEmployeeId = u.employeeId;
                if (!generatedEmployeeId || generatedEmployeeId.toString().trim() === '') {
                    let isUnique = false;
                    while (!isUnique) {
                        generatedEmployeeId = `EMP-${nextId.toString().padStart(4, '0')}`;
                        const existing = await User.findOne({ employeeId: generatedEmployeeId });
                        if (existing) {
                            nextId++;
                        } else {
                            isUnique = true;
                            nextId++;
                        }
                    }
                } else {
                    const empIdExists = await User.findOne({ employeeId: generatedEmployeeId });
                    if (empIdExists) {
                        throw new Error(`Row ${i + 1}: Employee ID ${generatedEmployeeId} already exists`);
                    }
                }

                const plainPassword = u.password ? u.password.toString().trim() : 'Welcome@123';
                const hashedPassword = await bcrypt.hash(plainPassword, salt);

                let role = u.role.toString().toLowerCase();
                if (!['admin', 'manager', 'employee'].includes(role)) {
                    role = 'employee';
                }

                const newUserData = {
                    fullName: u.fullName.toString().trim(),
                    email: u.email.toString().trim().toLowerCase(),
                    password: hashedPassword,
                    employeeId: generatedEmployeeId,
                    role: role,
                    department: (u.department || '').toString().trim(),
                    jobTitle: (u.jobTitle || '').toString().trim(),
                    status: 'ACTIVE',
                    phone: (u.phone || '').toString().trim(),
                    location: (u.location || '').toString().trim(),
                    employmentType: (u.employmentType || 'Full-time').toString().trim(),
                    skills: u.skills ? u.skills.toString().split(',').map(s => s.trim()).filter(s => s) : [],
                };

                await User.create(newUserData);
                results.successful++;

            } catch (err) {
                results.failed++;
                results.errors.push(err.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Bulk creation completed. ${results.successful} created, ${results.failed} failed.`,
            data: results
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
