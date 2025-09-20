const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PatientSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: {
            type: String,
            match: [/^[0-9]{6}$/, 'Pincode must be 6 digits']
        },
        country: {
            type: String,
            default: 'India'
        }
    },
    profileImage: {
        url: String,
        filename: String
    },
    isVerified: {
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
    },
    // Health-related information
    healthProfile: {
        bloodType: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
            default: 'Unknown'
        },
        height: {
            value: Number, // in cm
            unit: {
                type: String,
                default: 'cm'
            }
        },
        weight: {
            value: Number, // in kg
            unit: {
                type: String,
                default: 'kg'
            }
        },
        emergencyContact: {
            name: {
                type: String,
                required: false // Will be provided during profile completion
            },
            relationship: {
                type: String,
                required: false // Will be provided during profile completion
            },
            phone: {
                type: String,
                required: false, // Will be provided during profile completion
                validate: {
                    validator: function(v) {
                        // Only validate if the field is not empty
                        return !v || /^[0-9]{10}$/.test(v);
                    },
                    message: 'Emergency contact phone must be exactly 10 digits'
                }
            },
            email: String
        },
        medicalHistory: {
            chronicConditions: [{
                condition: String,
                diagnosedDate: Date,
                status: {
                    type: String,
                    enum: ['active', 'managed', 'resolved'],
                    default: 'active'
                },
                notes: String
            }],
            surgeries: [{
                procedure: String,
                date: Date,
                hospital: String,
                surgeon: String,
                notes: String
            }],
            hospitalizations: [{
                reason: String,
                admissionDate: Date,
                dischargeDate: Date,
                hospital: String,
                notes: String
            }]
        },
        allergies: [{
            allergen: String,
            severity: {
                type: String,
                enum: ['mild', 'moderate', 'severe', 'life-threatening'],
                default: 'mild'
            },
            reaction: String,
            discoveredDate: Date,
            notes: String
        }],
        medications: {
            current: [{
                name: String,
                dosage: String,
                frequency: String,
                prescribedBy: String,
                startDate: Date,
                endDate: Date,
                purpose: String,
                sideEffects: [String]
            }],
            past: [{
                name: String,
                dosage: String,
                takenFrom: Date,
                takenUntil: Date,
                reason: String,
                effectiveness: {
                    type: String,
                    enum: ['very-effective', 'effective', 'somewhat-effective', 'not-effective']
                }
            }]
        },
        familyHistory: [{
            relationship: {
                type: String,
                enum: ['parent', 'sibling', 'grandparent', 'aunt-uncle', 'cousin', 'other']
            },
            condition: String,
            ageOfOnset: Number,
            notes: String
        }],
        lifestyle: {
            smokingStatus: {
                type: String,
                enum: ['never', 'former', 'current', 'unknown'],
                default: 'unknown'
            },
            alcoholConsumption: {
                type: String,
                enum: ['never', 'occasionally', 'moderate', 'heavy', 'unknown'],
                default: 'unknown'
            },
            exerciseFrequency: {
                type: String,
                enum: ['never', 'rarely', 'weekly', 'daily', 'unknown'],
                default: 'unknown'
            },
            dietType: {
                type: String,
                enum: ['omnivore', 'vegetarian', 'vegan', 'other', 'unknown'],
                default: 'unknown'
            }
        },
        immunizations: [{
            vaccine: String,
            date: Date,
            provider: String,
            lotNumber: String,
            nextDueDate: Date
        }],
        vitalSigns: {
            lastRecorded: Date,
            bloodPressure: {
                systolic: Number,
                diastolic: Number
            },
            heartRate: Number,
            temperature: Number,
            oxygenSaturation: Number
        },
        // Temporary text fields for unstructured data
        allergiesNote: String,
        medicalHistoryNote: String
    },
    // Medical records and appointments
    medicalRecords: [{
        type: Schema.Types.ObjectId,
        ref: 'MedicalRecord'
    }],
    appointments: [{
        type: Schema.Types.ObjectId,
        ref: 'Appointment'
    }],
    prescriptions: [{
        type: Schema.Types.ObjectId,
        ref: 'Prescription'
    }],
    // Insurance information
    insurance: {
        provider: String,
        policyNumber: String,
        groupNumber: String,
        subscriberName: String,
        relationship: {
            type: String,
            enum: ['self', 'spouse', 'child', 'other'],
            default: 'self'
        },
        effectiveDate: Date,
        expirationDate: Date,
        copay: Number
    },
    // Preferences
    preferences: {
        preferredLanguage: {
            type: String,
            enum: ['English', 'Hindi', 'Telugu', 'Tamil', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'],
            default: 'English'
        },
        communicationMethod: {
            type: String,
            enum: ['email', 'sms', 'phone', 'portal'],
            default: 'email'
        },
        appointmentReminders: {
            type: Boolean,
            default: true
        },
        healthTips: {
            type: Boolean,
            default: true
        }
    }
});

// Update the updatedAt field before saving
PatientSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("Patient", PatientSchema);
