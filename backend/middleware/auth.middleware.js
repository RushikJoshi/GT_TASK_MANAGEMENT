const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authenticateToken = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized, no token provided', data: null });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id || decoded._id).select('-password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Not authorized, user not found', data: null });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed', data: null });
    }
};

const protect = authenticateToken; // Alias for backward compatibility if needed

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access Denied: You do not have permission', data: null });
        }
        next();
    };
};

module.exports = { authenticateToken, protect, authorizeRoles };
