const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DoctorSchema = new Schema({
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
    doctorId: {
        type: String,
        unique: true,
        required: false // Will be generated during profile completion
    },
    licenseNumber: {
        type: String,
        required: false, // Will be provided during profile completion
        unique: true,
        sparse: true // Allows multiple null values
    },
    specialization: {
        type: String,
        required: false, // Will be selected during profile completion
        enum: [
            'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 
            'Pediatrics', 'Gynecology', 'Dermatology', 'Psychiatry',
            'Ophthalmology', 'ENT', 'Radiology', 'Anesthesiology',
            'Emergency Medicine', 'Family Medicine', 'Internal Medicine',
            'Surgery', 'Oncology', 'Endocrinology', 'Nephrology',
            'Pulmonology', 'Gastroenterology', 'Urology', 'Rheumatology'
        ]
    },
    subSpecialization: String,
    qualifications: [{
        degree: {
            type: String,
            required: true
        },
        institution: {
            type: String,
            required: true
        },
        year: {
            type: Number,
            required: true
        },
        country: {
            type: String,
            default: 'India'
        }
    }],
    experience: {
        type: Number,
        required: false, // Will be provided during profile completion
        min: 0,
        max: 60 // years of experience
    },
    currentHospital: {
        name: {
            type: String,
            required: false // Will be provided during profile completion
        },
        department: String,
        position: String,
        joinDate: Date,
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String
        }
    },
    previousExperience: [{
        hospital: String,
        position: String,
        duration: String,
        responsibilities: String
    }],
    consultationFee: {
        inPerson: {
            type: Number,
            required: false, // Will be provided during profile completion
            min: 0
        },
        online: {
            type: Number,
            min: 0
        },
        followUp: {
            type: Number,
            min: 0
        }
    },
    availability: {
        schedule: [{
            dayOfWeek: {
                type: String,
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            },
            shifts: [{
                startTime: String, // 24-hour format "09:00"
                endTime: String,   // 24-hour format "17:00"
                slotDuration: {
                    type: Number,
                    default: 30 // minutes
                },
                maxPatients: {
                    type: Number,
                    default: 20
                }
            }]
        }],
        unavailableDates: [{
            date: Date,
            reason: String
        }],
        leaveRequests: [{
            startDate: Date,
            endDate: Date,
            reason: String,
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending'
            }
        }]
    },
    services: [{
        service: String,
        description: String,
        duration: Number, // in minutes
        fee: Number
    }],
    languages: [{
        type: String,
        enum: ['English', 'Hindi', 'Telugu', 'Tamil', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Other']
    }],
    awards: [{
        title: String,
        year: Number,
        organization: String,
        description: String
    }],
    publications: [{
        title: String,
        journal: String,
        year: Number,
        authors: [String],
        doi: String
    }],
    ratings: {
        overall: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        categories: {
            punctuality: { type: Number, default: 0 },
            communication: { type: Number, default: 0 },
            expertise: { type: Number, default: 0 },
            facilities: { type: Number, default: 0 }
        }
    },
    patients: [{
        type: Schema.Types.ObjectId,
        ref: 'Patient'
    }],
    appointments: [{
        type: Schema.Types.ObjectId,
        ref: 'Appointment'
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDocuments: [{
        type: {
            type: String,
            enum: ['license', 'degree', 'identity', 'experience']
        },
        url: String,
        filename: String,
        uploadDate: {
            type: Date,
            default: Date.now
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        }
    }],
    registrationDate: {
        type: Date,
        default: Date.now
    }
});

// Generate unique doctor ID
DoctorSchema.pre('save', async function(next) {
    if (!this.doctorId) {
        const count = await mongoose.model('Doctor').countDocuments();
        this.doctorId = `DOC${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model("Doctor", DoctorSchema);
