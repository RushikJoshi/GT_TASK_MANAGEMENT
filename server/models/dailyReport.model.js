const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD for uniqueness
    progressPercentage: { type: Number, required: true, min: 0, max: 100 },
    completedToday: { type: String, required: true },
    pending: { type: String, required: true },
    blockers: { type: String, default: '' },
    expectedCompletion: { type: String },
    attachments: [{ type: String }],
    managerNote: { type: String, default: '' },
    isApproved: { type: Boolean, default: false },
    isReviewed: { type: Boolean, default: false },
    // Extended approval fields (non-breaking additions)
    reportStatus: { type: String, enum: ['pending_review', 'approved', 'rejected'], default: 'pending_review' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null }
}, { timestamps: true });

// Ensure unique report per task per employee per day
dailyReportSchema.index({ task: 1, employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
