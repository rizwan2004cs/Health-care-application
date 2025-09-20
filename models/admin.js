const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AdminSchema = new Schema({
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
    adminId: {
        type: String,
        unique: true,
        required: true
    },
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    department: {
        type: String,
        required: true,
        enum: [
            'IT', 'Human Resources', 'Medical Administration',
            'Finance', 'Operations', 'Quality Assurance',
            'Patient Relations', 'Pharmacy', 'Laboratory',
            'Radiology', 'Nursing', 'Security', 'Maintenance'
        ]
    },
    position: {
        type: String,
        required: true,
        enum: [
            'System Administrator', 'Database Administrator', 'IT Manager',
            'HR Manager', 'Medical Director', 'Chief Medical Officer',
            'Finance Manager', 'Operations Manager', 'QA Manager',
            'Patient Relations Manager', 'Pharmacy Manager', 'Lab Manager',
            'Radiology Manager', 'Nursing Supervisor', 'Security Manager',
            'Facility Manager', 'Super Admin', 'Department Admin'
        ]
    },
    accessLevel: {
        type: String,
        required: true,
        enum: ['super-admin', 'admin', 'manager', 'supervisor', 'staff'],
        default: 'staff'
    },
    permissions: {
        users: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        doctors: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            verify: { type: Boolean, default: false }
        },
        patients: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        appointments: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            cancel: { type: Boolean, default: false }
        },
        reports: {
            view: { type: Boolean, default: true },
            generate: { type: Boolean, default: false },
            export: { type: Boolean, default: false }
        },
        system: {
            settings: { type: Boolean, default: false },
            backup: { type: Boolean, default: false },
            maintenance: { type: Boolean, default: false },
            audit: { type: Boolean, default: false }
        }
    },
    workSchedule: {
        workingDays: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }],
        workingHours: {
            start: String, // "09:00"
            end: String    // "18:00"
        },
        shiftType: {
            type: String,
            enum: ['day', 'night', 'rotating', 'flexible'],
            default: 'day'
        }
    },
    contactInfo: {
        officePhone: String,
        extension: String,
        emergencyContact: {
            name: String,
            relationship: String,
            phone: String
        }
    },
    employment: {
        joinDate: {
            type: Date,
            required: true
        },
        employmentType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'temporary'],
            default: 'full-time'
        },
        probationPeriod: {
            duration: Number, // in months
            endDate: Date,
            status: {
                type: String,
                enum: ['ongoing', 'completed', 'extended'],
                default: 'ongoing'
            }
        },
        salary: {
            basic: Number,
            allowances: Number,
            currency: {
                type: String,
                default: 'INR'
            }
        }
    },
    systemAccess: {
        ipRestrictions: [String], // allowed IP addresses
        deviceRestrictions: [String], // allowed device IDs
        sessionTimeout: {
            type: Number,
            default: 480 // minutes (8 hours)
        },
        multipleLoginAllowed: {
            type: Boolean,
            default: false
        }
    },
    activities: [{
        action: String,
        module: String,
        details: Schema.Types.Mixed,
        timestamp: {
            type: Date,
            default: Date.now
        },
        ipAddress: String,
        userAgent: String
    }],
    notifications: {
        email: {
            systemAlerts: { type: Boolean, default: true },
            userRegistrations: { type: Boolean, default: true },
            appointmentUpdates: { type: Boolean, default: false },
            reportGeneration: { type: Boolean, default: true }
        },
        sms: {
            systemAlerts: { type: Boolean, default: false },
            emergencyAlerts: { type: Boolean, default: true }
        }
    },
    twoFactorAuth: {
        enabled: {
            type: Boolean,
            default: false
        },
        method: {
            type: String,
            enum: ['sms', 'email', 'app'],
            default: 'sms'
        },
        backupCodes: [String]
    },
    supervisor: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    subordinates: [{
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    registrationDate: {
        type: Date,
        default: Date.now
    }
});

// Generate unique admin ID
AdminSchema.pre('save', async function(next) {
    if (!this.adminId) {
        const count = await mongoose.model('Admin').countDocuments();
        this.adminId = `ADM${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model("Admin", AdminSchema);
 