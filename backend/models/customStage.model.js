const mongoose = require('mongoose');

const customStageSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#14b8a6' },
    orderIndex: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('CustomStage', customStageSchema);
