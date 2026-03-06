const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables!');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

exports.register = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all fields', data: null });
        }

        // Check user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists', data: null });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
        });

        if (user) {
            const token = generateToken(user._id);
            const userData = {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            };

            return res.status(201).json({
                success: true,
                message: 'Account created successfully',
                data: {
                    user: userData,
                    token
                }
            });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid user data', data: null });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password', data: null });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', data: null });
        }

        // --- NEW LOGIC: VERIFY loginType === user.role ---
        const loginType = req.body.loginType || req.query.loginType || req.params.loginType;
        if (loginType && loginType !== user.role) {
            return res.status(403).json({ success: false, message: 'You are not authorized to use this portal.', data: null });
        }

        // Match password — with auto-migration for legacy plain-text passwords
        let isMatch = false;

        const isHashed = user.password && user.password.startsWith('$2');

        if (isHashed) {
            // Normal bcrypt comparison
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // Legacy user: password was stored as plain text (before hashing was enforced)
            isMatch = (password === user.password);

            if (isMatch) {
                // Auto-migrate: hash and save for all future logins
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
                await user.save();
            }
        }

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid email or password', data: null });
        }

        const token = generateToken(user._id);
        // convert stored avatar+mime back to DataURL for client
        let avatarUrl = '';
        if (user.avatar && user.avatarMime) {
            avatarUrl = `data:${user.avatarMime};base64,${user.avatar}`;
        }
        const userData = {
            _id: user._id,
            name: user.fullName,  // Output as name specifically mapped
            fullName: user.fullName, // Also keeping fullName for frontend compatibility
            email: user.email,
            role: user.role,
            avatar: avatarUrl
        };

        return res.status(200).json({
            success: true,
            message: 'Login successful', // Exact text requested
            token,                       // Top level token
            user: userData               // Top level user object
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

exports.getProfile = async (req, res) => {
    try {
        let user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', data: null });
        }
        user = user.toObject();
        // reconstruct DataURL to send
        if (user.avatar && user.avatarMime) {
            user.avatar = `data:${user.avatarMime};base64,${user.avatar}`;
        } else {
            user.avatar = '';
        }
        res.status(200).json({ success: true, message: 'Profile fetched', data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', data: null });
        }

        const { avatar, fullName, phone, jobTitle, department, preferences } = req.body;

        if (fullName) user.fullName = fullName;
        if (avatar) {
            // avatar expected as DataURL; strip metadata and save separately
            const match = avatar.match(/^data:(.+);base64,(.+)$/);
            if (match) {
                user.avatarMime = match[1];
                user.avatar = match[2];
            } else {
                // if already raw base64, just save it
                user.avatar = avatar;
            }
        }
        if (phone !== undefined) user.phone = phone;
        if (jobTitle !== undefined) user.jobTitle = jobTitle;
        if (department !== undefined) user.department = department;

        if (preferences) {
            if (preferences.theme) user.preferences.theme = preferences.theme;
            if (preferences.notifications !== undefined) user.preferences.notifications = preferences.notifications;
        }

        const updatedUser = await user.save();
        let userData = updatedUser.toObject();
        delete userData.password; // Don't send password back
        // reconstruct avatar DataURL
        if (userData.avatar && userData.avatarMime) {
            userData.avatar = `data:${userData.avatarMime};base64,${userData.avatar}`;
        } else {
            userData.avatar = '';
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: userData
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};
