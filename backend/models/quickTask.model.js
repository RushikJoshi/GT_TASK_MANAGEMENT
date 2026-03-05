const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, default: false }
}, { _id: true });

const quickTaskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        default: 'MEDIUM'
    },
    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'DONE'],
        default: 'TODO'
    },

    category: {
        type: String,
        enum: ['Meeting', 'Follow Up', 'Client Work', 'Internal Task', 'Reminder'],
        default: 'Internal Task'
    },

    dueDate: { type: Date, default: null },

    // Reminder
    reminderTime: { type: Date, default: null },
    reminderType: {
        type: String,
        enum: ['Dashboard Notification', 'Email Notification', 'None'],
        default: 'None'
    },
    reminderSent: { type: Boolean, default: false },

    // Recurring
    repeatType: {
        type: String,
        enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'],
        default: 'NONE'
    },

    // Checklist
    checklist: [checklistItemSchema],

    // Comments
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],

    // Attachments (stored as URLs/names)
    attachments: [{ type: String }],

    isArchived: { type: Boolean, default: false }

}, { timestamps: true });

// Virtual: checklist progress percentage
quickTaskSchema.virtual('checklistProgress').get(function () {
    if (!this.checklist || this.checklist.length === 0) return 0;
    const done = this.checklist.filter(c => c.completed).length;
    return Math.round((done / this.checklist.length) * 100);
});

quickTaskSchema.set('toJSON', { virtuals: true });
quickTaskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('QuickTask', quickTaskSchema);
