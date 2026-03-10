const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { type: String, default: 'In Progress' },
    description: { type: String },
    deadline: { type: String },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workflow: {
        type: Array,
        default: [
            { id: 'todo', name: 'To Do', color: '#64748b', type: 'todo' },
            { id: 'in_progress', name: 'In Progress', color: '#3b82f6', type: 'active' },
            { id: 'review', name: 'Review', color: '#f59e0b', type: 'active' },
            { id: 'hold', name: 'On Hold', color: '#ef4444', type: 'active' },
            { id: 'completed', name: 'Completed', color: '#10b981', type: 'done' }
        ]
    }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
