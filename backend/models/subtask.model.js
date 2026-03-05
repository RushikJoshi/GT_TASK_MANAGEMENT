const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    stage: { type: String }, // Stores name or ID
    stageColor: { type: String, default: '#64748b' },
    stageType: { type: String, enum: ['project', 'custom'], default: 'project' },
    customStageRef: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomStage' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    dueDate: { type: Date },
    progressPercentage: { type: Number, default: 0 },
    blockers: { type: String },
    attachments: [{ type: String }],
    orderIndex: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Subtask', subtaskSchema);
