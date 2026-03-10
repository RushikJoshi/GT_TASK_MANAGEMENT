const Activity = require('../models/activity.model');

exports.getActivities = async (req, res) => {
    try {
        const query = req.user.role === 'admin' || req.user.role === 'manager'
            ? {}
            : { user: req.user._id };

        const activities = await Activity.find(query)
            .populate('user', 'fullName email _id avatar')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({ success: true, data: activities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
