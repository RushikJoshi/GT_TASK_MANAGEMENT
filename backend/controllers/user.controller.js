const User = require('../models/user.model');

// @desc    Get all active employees (For manager/admin dropdowns)
// @route   GET /api/users/employees
// @access  Private (Admin/Manager)
exports.getEmployees = async (req, res) => {
    try {
        const filter = { status: 'Active' };

        // If they want everyone who is an employee
        filter.role = 'employee';

        // Only if manager, we might just load employees reporting to them? 
        // Instructions: 'select employees from dropdown', assume all active employees
        const employees = await User.find(filter)
            .select('fullName email avatar _id')
            .sort({ fullName: 1 });

        res.status(200).json({ success: true, data: employees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
