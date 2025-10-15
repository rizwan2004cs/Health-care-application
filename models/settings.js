const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
        unique: true
    },
    emailNotifications: {
        type: Boolean,
        default: true
    },
    appointmentReminders: {
        type: Boolean,
        default: true
    },
    databaseBackups: {
        type: Boolean,
        default: true
    },
    twoFactorAuth: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
settingsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
