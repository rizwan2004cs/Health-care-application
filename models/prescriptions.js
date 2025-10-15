const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PrescriptionSchema = new Schema({
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
    appointment: {
        type: Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    prescriptionNumber: {
        type: String,
        unique: true
    },
    prescriptionDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    diagnosis: {
        primary: {
            type: String,
            required: true,
            maxlength: 200
        },
        secondary: [{
            type: String,
            maxlength: 200
        }],
        icdCode: String // International Classification of Diseases
    },
    medications: [{
        name: {
            type: String,
            required: true,
            maxlength: 200
        },
        genericName: {
            type: String,
            maxlength: 200
        },
        strength: {
            type: String,
            required: true // e.g., "500mg", "10ml"
        },
        dosageForm: {
            type: String,
            required: true,
            enum: ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'ointment', 'inhaler', 'patch', 'other']
        },
        dosage: {
            frequency: {
                type: String,
                required: true // e.g., "2 times daily", "every 8 hours"
            },
            quantity: {
                type: String,
                required: true // e.g., "1 tablet", "5ml"
            },
            timing: {
                type: String,
                enum: ['before-meals', 'after-meals', 'with-meals', 'empty-stomach', 'bedtime', 'anytime'],
                default: 'anytime'
            },
            duration: {
                type: String,
                required: true // e.g., "7 days", "2 weeks", "1 month"
            }
        },
        instructions: {
            type: String,
            maxlength: 500
        },
        warnings: [{
            type: String,
            maxlength: 200
        }],
        sideEffects: [{
            type: String,
            maxlength: 200
        }],
        contraindications: [{
            type: String,
            maxlength: 200
        }],
        cost: {
            unitPrice: Number,
            totalPrice: Number
        },
        substitutes: [{
            name: String,
            strength: String,
            manufacturer: String
        }],
        refillsAllowed: {
            type: Number,
            default: 0
        },
        refillsRemaining: {
            type: Number,
            default: 0
        }
    }],
    instructions: {
        general: {
            type: String,
            maxlength: 1000
        },
        dietary: {
            type: String,
            maxlength: 500
        },
        activity: {
            type: String,
            maxlength: 500
        },
        followUp: {
            type: String,
            maxlength: 500
        }
    },
    labTests: [{
        testName: String,
        reason: String,
        urgency: {
            type: String,
            enum: ['routine', 'urgent', 'immediate'],
            default: 'routine'
        },
        instructions: String
    }],
    allergies: [{
        allergen: String,
        reaction: String,
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe'],
            default: 'mild'
        }
    }],
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'expired', 'on-hold'],
        default: 'active'
    },
    validUntil: {
        type: Date,
        required: true
    },
    pharmacy: {
        name: String,
        address: String,
        phone: String,
        dispensedDate: Date,
        pharmacistName: String
    },
    cost: {
        medicationCost: {
            type: Number,
            default: 0
        },
        consultationFee: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        },
        insurance: {
            covered: {
                type: Boolean,
                default: false
            },
            coveragePercentage: {
                type: Number,
                min: 0,
                max: 100
            },
            copay: Number,
            claimNumber: String
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'insurance-pending', 'insurance-approved', 'refunded'],
            default: 'pending'
        }
    },
    refills: [{
        refillDate: {
            type: Date,
            default: Date.now
        },
        refillNumber: Number,
        pharmacy: String,
        dispensedBy: String,
        medications: [{
            medicationId: String,
            quantityDispensed: String,
            cost: Number
        }]
    }],
    interactions: {
        drugInteractions: [{
            medications: [String],
            severity: {
                type: String,
                enum: ['minor', 'moderate', 'major'],
                default: 'minor'
            },
            description: String
        }],
        allergyAlerts: [{
            medication: String,
            allergen: String,
            severity: String,
            alert: String
        }]
    },
    compliance: {
        adherenceScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 100
        },
        missedDoses: [{
            medicationName: String,
            missedDate: Date,
            reason: String
        }],
        sideEffectsReported: [{
            medicationName: String,
            sideEffect: String,
            severity: String,
            reportedDate: Date
        }]
    },
    digitalSignature: {
        doctorSignature: String,
        timestamp: Date,
        ipAddress: String
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

// Indexes
PrescriptionSchema.index({ patient: 1, prescriptionDate: -1 });
PrescriptionSchema.index({ doctor: 1, prescriptionDate: -1 });
// prescriptionNumber index is automatically created by unique: true
PrescriptionSchema.index({ status: 1 });
PrescriptionSchema.index({ validUntil: 1 });

// Generate prescription number
PrescriptionSchema.pre('save', async function(next) {
    this.updatedAt = new Date();
    
    if (!this.prescriptionNumber) {
        const count = await mongoose.model('Prescription').countDocuments();
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        this.prescriptionNumber = `RX${year}${month}${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate total cost
    if (this.medications && this.medications.length > 0) {
        this.cost.medicationCost = this.medications.reduce((total, med) => {
            return total + (med.cost?.totalPrice || 0);
        }, 0);
        this.cost.total = this.cost.medicationCost + (this.cost.consultationFee || 0);
    }
    
    // Set refills remaining when first created
    this.medications.forEach(med => {
        if (med.refillsRemaining === undefined) {
            med.refillsRemaining = med.refillsAllowed || 0;
        }
    });
    
    next();
});

// Virtual for formatted prescription date
PrescriptionSchema.virtual('formattedDate').get(function() {
    return this.prescriptionDate ? this.prescriptionDate.toLocaleDateString() : '';
});

// Virtual for prescription validity
PrescriptionSchema.virtual('isValid').get(function() {
    return this.validUntil > new Date() && this.status === 'active';
});

// Virtual for days until expiry
PrescriptionSchema.virtual('daysUntilExpiry').get(function() {
    if (!this.validUntil) return 0;
    const now = new Date();
    const diffTime = this.validUntil.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
PrescriptionSchema.methods.canRefill = function(medicationIndex) {
    const medication = this.medications[medicationIndex];
    if (!medication) return false;
    
    return this.isValid && 
           medication.refillsRemaining > 0 && 
           this.status === 'active';
};

PrescriptionSchema.methods.processRefill = function(medicationIndex, pharmacyInfo) {
    if (!this.canRefill(medicationIndex)) {
        throw new Error('Prescription cannot be refilled');
    }
    
    const medication = this.medications[medicationIndex];
    medication.refillsRemaining -= 1;
    
    this.refills.push({
        refillNumber: (this.refills.length + 1),
        pharmacy: pharmacyInfo.name,
        dispensedBy: pharmacyInfo.pharmacist,
        medications: [{
            medicationId: medication._id,
            quantityDispensed: medication.dosage.quantity,
            cost: medication.cost?.totalPrice || 0
        }]
    });
    
    return this.save();
};

PrescriptionSchema.methods.getTotalMedications = function() {
    return this.medications.length;
};

PrescriptionSchema.methods.getActiveMedications = function() {
    return this.medications.filter(med => {
        // Check if medication duration hasn't expired
        const prescriptionAge = (new Date() - this.prescriptionDate) / (1000 * 60 * 60 * 24);
        const durationDays = this.parseDuration(med.dosage.duration);
        return prescriptionAge <= durationDays;
    });
};

PrescriptionSchema.methods.parseDuration = function(duration) {
    // Parse duration string like "7 days", "2 weeks", "1 month"
    const match = duration.match(/(\d+)\s*(day|week|month)s?/i);
    if (!match) return 30; // default 30 days
    
    const number = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 'day': return number;
        case 'week': return number * 7;
        case 'month': return number * 30;
        default: return 30;
    }
};

// Static methods
PrescriptionSchema.statics.getActivePrescriptions = function(patientId) {
    return this.find({
        patient: patientId,
        status: 'active',
        validUntil: { $gte: new Date() }
    }).populate('doctor', 'firstName lastName specialization');
};

PrescriptionSchema.statics.getRecentPrescriptions = function(patientId, limit = 10) {
    return this.find({ patient: patientId })
        .populate('doctor', 'firstName lastName specialization')
        .sort({ prescriptionDate: -1 })
        .limit(limit);
};

module.exports = mongoose.model("Prescription", PrescriptionSchema);