const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AppointmentSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    appointmentTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
    },
    duration: {
        type: Number,
        default: 30, // minutes
        min: 15,
        max: 120
    },
    type: {
        type: String,
        enum: ['consultation', 'follow-up', 'emergency', 'routine-checkup', 'specialist'],
        default: 'consultation'
    },
    mode: {
        type: String,
        enum: ['in-person', 'online', 'phone'],
        default: 'in-person'
    },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'],
        default: 'scheduled'
    },
    reason: {
        type: String,
        required: true,
        maxlength: 500
    },
    symptoms: [{
        type: String,
        maxlength: 100
    }],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    notes: {
        patient: {
            type: String,
            maxlength: 1000
        },
        doctor: {
            type: String,
            maxlength: 1000
        },
        admin: {
            type: String,
            maxlength: 500
        }
    },
    prescription: {
        type: Schema.Types.ObjectId,
        ref: 'Prescription'
    },
    testResults: [{
        type: Schema.Types.ObjectId,
        ref: 'TestResult'
    }],
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: {
        type: Date
    },
    cost: {
        consultationFee: {
            type: Number,
            min: 0
        },
        additionalCharges: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            min: 0
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'partially-paid', 'refunded'],
            default: 'pending'
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'card', 'online', 'insurance', 'wallet']
        }
    },
    reminders: {
        sent: [{
            type: Date
        }],
        nextReminder: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    cancelledAt: Date,
    cancellationReason: String,
    rescheduledFrom: {
        date: Date,
        time: String,
        reason: String
    }
});

// Index for efficient queries
AppointmentSchema.index({ patient: 1, appointmentDate: 1 });
AppointmentSchema.index({ doctor: 1, appointmentDate: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });

// Update updatedAt before saving
AppointmentSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Calculate total cost
    if (this.cost.consultationFee !== undefined) {
        this.cost.total = (this.cost.consultationFee || 0) + (this.cost.additionalCharges || 0);
    }
    
    next();
});

// Virtual for appointment datetime
AppointmentSchema.virtual('appointmentDateTime').get(function() {
    if (this.appointmentDate && this.appointmentTime) {
        const [hours, minutes] = this.appointmentTime.split(':');
        const dateTime = new Date(this.appointmentDate);
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return dateTime;
    }
    return null;
});

// Virtual for formatted date
AppointmentSchema.virtual('formattedDate').get(function() {
    return this.appointmentDate ? this.appointmentDate.toLocaleDateString() : '';
});

// Virtual for formatted time
AppointmentSchema.virtual('formattedTime').get(function() {
    if (this.appointmentTime) {
        const [hours, minutes] = this.appointmentTime.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }
    return '';
});

// Methods
AppointmentSchema.methods.canCancel = function() {
    const now = new Date();
    const appointmentDateTime = this.appointmentDateTime;
    if (!appointmentDateTime) return false;
    
    // Can cancel if appointment is at least 2 hours away
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const hoursAway = timeDiff / (1000 * 60 * 60);
    
    return hoursAway >= 2 && ['scheduled', 'confirmed'].includes(this.status);
};

AppointmentSchema.methods.canReschedule = function() {
    return this.canCancel(); // Same rules as cancellation
};

module.exports = mongoose.model("Appointment", AppointmentSchema);