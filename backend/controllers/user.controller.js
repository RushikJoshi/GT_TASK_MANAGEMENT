const User = require('../models/user.model');

// @desc    Get all active employees (For manager/admin dropdowns)
// @route   GET /api/users/employees
// @access  Private (Admin/Manager)
exports.getEmployees = async (req, res) => {
    try {
        const filter = { status: 'ACTIVE', role: 'employee' };

        // If the requester is a manager, they should only see employees reporting to them
        if (req.user && req.user.role === 'manager') {
            filter.reportingManager = req.user.id;
        }

        const employees = await User.find(filter)
            .select('fullName email avatar role reportingManager _id')
            .sort({ fullName: 1 });

        res.status(200).json({ success: true, data: employees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all non-admin users for assignment (All roles can access)
// @route   GET /api/users/assignable
// @access  Private
exports.getAssignableUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' }, status: 'ACTIVE' })
            .select('fullName email avatar role _id')
            .sort({ fullName: 1 });
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
