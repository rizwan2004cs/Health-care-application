const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MedicationTrackingSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    medications: [{
        prescriptionId: {
            type: Schema.Types.ObjectId,
            ref: 'Prescription'
        },
        medicationName: {
            type: String,
            required: true
        },
        strength: String,
        dosage: String,
        taken: {
            type: Boolean,
            default: false
        },
        takenAt: Date,
        type: {
            type: String,
            enum: ['prescription', 'supplement'],
            default: 'prescription'
        }
    }],
    supplements: [{
        name: {
            type: String,
            required: true
        },
        dosage: String,
        taken: {
            type: Boolean,
            default: false
        },
        takenAt: Date
    }]
}, {
    timestamps: true
});

// Compound index for efficient queries
MedicationTrackingSchema.index({ patient: 1, date: 1 });

// Static method to get or create today's tracking
MedicationTrackingSchema.statics.getTodayTracking = async function(patientId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let tracking = await this.findOne({
        patient: patientId,
        date: {
            $gte: today,
            $lt: tomorrow
        }
    });
    
    if (!tracking) {
        tracking = new this({
            patient: patientId,
            date: today,
            medications: [],
            supplements: []
        });
        await tracking.save();
    }
    
    return tracking;
};

// Method to mark medication as taken
MedicationTrackingSchema.methods.markMedicationTaken = function(medicationName, type = 'prescription') {
    const list = type === 'supplement' ? this.supplements : this.medications;
    const item = list.find(m => m.medicationName === medicationName || m.name === medicationName);
    
    if (item) {
        item.taken = true;
        item.takenAt = new Date();
    }
    
    return this.save();
};

// Method to unmark medication
MedicationTrackingSchema.methods.unmarkMedicationTaken = function(medicationName, type = 'prescription') {
    const list = type === 'supplement' ? this.supplements : this.medications;
    const item = list.find(m => m.medicationName === medicationName || m.name === medicationName);
    
    if (item) {
        item.taken = false;
        item.takenAt = null;
    }
    
    return this.save();
};

module.exports = mongoose.model("MedicationTracking", MedicationTrackingSchema);
