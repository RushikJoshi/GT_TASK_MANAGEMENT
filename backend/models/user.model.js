const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    employeeId: { type: String, unique: true },
    phone: { type: String, default: '' },

    role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
    department: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    joiningDate: { type: Date, default: Date.now },
    location: { type: String, default: '' },
    employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Contract'], default: 'Full-time' },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    skills: [{ type: String }],

    // avatar is stored as base64 string (without metadata) plus mime type for reconstruction
    avatar: { type: String, default: '' },
    avatarMime: { type: String, default: '' },

    preferences: {
        theme: { type: String, default: 'light' },
        notifications: { type: Boolean, default: true }
    },
    lastLogin: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
