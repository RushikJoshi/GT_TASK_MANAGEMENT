const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, enum: ['task', 'project'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
