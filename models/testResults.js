const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TestResultSchema = new Schema({
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
    testType: {
        type: String,
        required: true,
        enum: [
            'blood-test', 'urine-test', 'x-ray', 'mri', 'ct-scan', 
            'ultrasound', 'ecg', 'echo', 'endoscopy', 'biopsy',
            'allergy-test', 'diabetes-test', 'cholesterol-test',
            'thyroid-test', 'liver-function', 'kidney-function',
            'cardiac-test', 'lung-function', 'bone-density',
            'genetic-test', 'covid-test', 'other'
        ]
    },
    testName: {
        type: String,
        required: true,
        maxlength: 200
    },
    testDate: {
        type: Date,
        required: true
    },
    reportDate: {
        type: Date,
        default: Date.now
    },
    labName: {
        type: String,
        required: true,
        maxlength: 200
    },
    labAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    technician: {
        name: String,
        id: String
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'reviewed', 'abnormal-flagged'],
        default: 'completed'
    },
    priority: {
        type: String,
        enum: ['routine', 'urgent', 'stat'],
        default: 'routine'
    },
    results: {
        summary: {
            type: String,
            required: true,
            maxlength: 1000
        },
        interpretation: {
            type: String,
            maxlength: 1000
        },
        normalRange: String,
        units: String,
        methodology: String,
        abnormalFlags: [{
            parameter: String,
            value: String,
            normalRange: String,
            flag: {
                type: String,
                enum: ['high', 'low', 'critical-high', 'critical-low', 'abnormal']
            }
        }]
    },
    parameters: [{
        name: {
            type: String,
            required: true
        },
        value: {
            type: String,
            required: true
        },
        unit: String,
        normalRange: String,
        status: {
            type: String,
            enum: ['normal', 'high', 'low', 'critical-high', 'critical-low', 'abnormal'],
            default: 'normal'
        },
        reference: String
    }],
    documents: [{
        filename: {
            type: String,
            required: true
        },
        originalName: String,
        url: String,
        uploadDate: {
            type: Date,
            default: Date.now
        },
        fileType: {
            type: String,
            enum: ['pdf', 'image', 'document'],
            default: 'pdf'
        },
        size: Number
    }],
    doctorReview: {
        reviewed: {
            type: Boolean,
            default: false
        },
        reviewDate: Date,
        comments: {
            type: String,
            maxlength: 1000
        },
        recommendations: [{
            type: String,
            maxlength: 200
        }],
        followUpRequired: {
            type: Boolean,
            default: false
        },
        severity: {
            type: String,
            enum: ['normal', 'mild', 'moderate', 'severe', 'critical']
        }
    },
    sharing: {
        sharedWith: [{
            doctor: {
                type: Schema.Types.ObjectId,
                ref: 'Doctor'
            },
            sharedDate: {
                type: Date,
                default: Date.now
            },
            permission: {
                type: String,
                enum: ['view', 'comment'],
                default: 'view'
            }
        }],
        isPublic: {
            type: Boolean,
            default: false
        }
    },
    notifications: {
        patientNotified: {
            type: Boolean,
            default: false
        },
        notificationDate: Date,
        remindersSent: [{
            type: Date
        }]
    },
    cost: {
        testCost: Number,
        labCharges: Number,
        total: Number,
        insurance: {
            covered: Boolean,
            claimNumber: String,
            coverageAmount: Number
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'insurance-pending', 'insurance-paid'],
            default: 'pending'
        }
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

// Indexes for efficient queries
TestResultSchema.index({ patient: 1, testDate: -1 });
TestResultSchema.index({ doctor: 1, testDate: -1 });
TestResultSchema.index({ testType: 1 });
TestResultSchema.index({ status: 1 });
TestResultSchema.index({ 'doctorReview.reviewed': 1 });

// Update updatedAt before saving
TestResultSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Calculate total cost
    if (this.cost && (this.cost.testCost !== undefined || this.cost.labCharges !== undefined)) {
        this.cost.total = (this.cost.testCost || 0) + (this.cost.labCharges || 0);
    }
    
    next();
});

// Virtual for formatted test date
TestResultSchema.virtual('formattedTestDate').get(function() {
    return this.testDate ? this.testDate.toLocaleDateString() : '';
});

// Virtual for formatted report date
TestResultSchema.virtual('formattedReportDate').get(function() {
    return this.reportDate ? this.reportDate.toLocaleDateString() : '';
});

// Virtual for overall status
TestResultSchema.virtual('overallStatus').get(function() {
    if (this.results.abnormalFlags && this.results.abnormalFlags.length > 0) {
        const hasCritical = this.results.abnormalFlags.some(flag => 
            flag.flag.includes('critical'));
        return hasCritical ? 'critical' : 'abnormal';
    }
    return 'normal';
});

// Methods
TestResultSchema.methods.hasAbnormalValues = function() {
    return this.parameters.some(param => param.status !== 'normal');
};

TestResultSchema.methods.getCriticalValues = function() {
    return this.parameters.filter(param => 
        param.status === 'critical-high' || param.status === 'critical-low');
};

TestResultSchema.methods.needsReview = function() {
    return !this.doctorReview.reviewed && (this.hasAbnormalValues() || this.overallStatus !== 'normal');
};

module.exports = mongoose.model("TestResult", TestResultSchema);