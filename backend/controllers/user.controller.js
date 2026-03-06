const User = require('../models/user.model');

// @desc    Get all active employees (For manager/admin dropdowns)
// @route   GET /api/users/employees
// @access  Private (Admin/Manager)
exports.getEmployees = async (req, res) => {
    try {
        // status is stored as uppercase in the database; earlier code mistakenly used
        // 'Active' which returned no results. normalize and match exactly.
        const filter = { status: 'ACTIVE', role: 'employee' };

        // (If business rules change later we might filter by reportingManager etc.)
        const employees = await User.find(filter)
            .select('fullName email avatar _id')
            .sort({ fullName: 1 });

        res.status(200).json({ success: true, data: employees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
