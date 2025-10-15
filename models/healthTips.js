const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HealthTipSchema = new Schema({
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    summary: {
        type: String,
        required: true,
        maxlength: 300
    },
    category: {
        type: String,
        required: true,
        enum: [
            'nutrition', 'exercise', 'mental-health', 'preventive-care',
            'chronic-disease', 'heart-health', 'diabetes', 'weight-management',
            'sleep', 'stress-management', 'women-health', 'men-health',
            'child-health', 'senior-health', 'seasonal-health', 'general'
        ]
    },
    tags: [{
        type: String,
        maxlength: 50
    }],
    targetAudience: {
        ageGroup: {
            type: String,
            enum: ['children', 'teens', 'adults', 'seniors', 'all'],
            default: 'all'
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'all'],
            default: 'all'
        },
        conditions: [{
            type: String,
            enum: [
                'diabetes', 'hypertension', 'heart-disease', 'obesity',
                'asthma', 'arthritis', 'depression', 'anxiety', 'none'
            ]
        }]
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    difficulty: {
        type: String,
        enum: ['easy', 'moderate', 'challenging'],
        default: 'easy'
    },
    timeToRead: {
        type: Number, // in minutes
        default: 2
    },
    source: {
        author: {
            type: String,
            maxlength: 100
        },
        organization: {
            type: String,
            maxlength: 100
        },
        url: String,
        credibility: {
            type: String,
            enum: ['verified', 'peer-reviewed', 'expert-opinion', 'general'],
            default: 'general'
        }
    },
    media: {
        image: {
            url: String,
            filename: String,
            alt: String
        },
        video: {
            url: String,
            title: String,
            duration: Number // in seconds
        }
    },
    engagement: {
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        shares: {
            type: Number,
            default: 0
        },
        bookmarks: {
            type: Number,
            default: 0
        }
    },
    interactions: {
        likedBy: [{
            patient: {
                type: Schema.Types.ObjectId,
                ref: 'Patient'
            },
            date: {
                type: Date,
                default: Date.now
            }
        }],
        bookmarkedBy: [{
            patient: {
                type: Schema.Types.ObjectId,
                ref: 'Patient'
            },
            date: {
                type: Date,
                default: Date.now
            }
        }],
        sharedBy: [{
            patient: {
                type: Schema.Types.ObjectId,
                ref: 'Patient'
            },
            date: {
                type: Date,
                default: Date.now
            },
            platform: String
        }]
    },
    seasonal: {
        isseasonal: {
            type: Boolean,
            default: false
        },
        season: {
            type: String,
            enum: ['spring', 'summer', 'monsoon', 'winter', 'all'],
            default: 'all'
        },
        validFrom: Date,
        validUntil: Date
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'featured'],
        default: 'published'
    },
    featured: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String,
        enum: ['admin', 'doctor', 'system'],
        default: 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    publishedAt: Date,
    lastViewedAt: Date
});

// Indexes for efficient queries
HealthTipSchema.index({ category: 1, status: 1 });
HealthTipSchema.index({ tags: 1 });
HealthTipSchema.index({ featured: 1, status: 1 });
HealthTipSchema.index({ 'targetAudience.ageGroup': 1, 'targetAudience.gender': 1 });
HealthTipSchema.index({ createdAt: -1 });
HealthTipSchema.index({ 'engagement.views': -1 });

// Update updatedAt before saving
HealthTipSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Set publishedAt when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    
    next();
});

// Virtual for reading time estimation
HealthTipSchema.virtual('estimatedReadTime').get(function() {
    if (this.timeToRead) return this.timeToRead;
    
    // Estimate based on content length (average 200 words per minute)
    const wordCount = this.content.split(' ').length;
    return Math.ceil(wordCount / 200);
});

// Virtual for engagement score
HealthTipSchema.virtual('engagementScore').get(function() {
    const views = this.engagement.views || 0;
    const likes = this.engagement.likes || 0;
    const shares = this.engagement.shares || 0;
    const bookmarks = this.engagement.bookmarks || 0;
    
    // Weighted engagement score
    return (views * 0.1) + (likes * 0.3) + (shares * 0.4) + (bookmarks * 0.2);
});

// Methods
HealthTipSchema.methods.incrementView = function() {
    this.engagement.views = (this.engagement.views || 0) + 1;
    this.lastViewedAt = new Date();
    return this.save();
};

HealthTipSchema.methods.toggleLike = function(patientId) {
    const existingLike = this.interactions.likedBy.find(
        like => like.patient.toString() === patientId.toString()
    );
    
    if (existingLike) {
        // Remove like
        this.interactions.likedBy.pull(existingLike._id);
        this.engagement.likes = Math.max(0, (this.engagement.likes || 1) - 1);
    } else {
        // Add like
        this.interactions.likedBy.push({ patient: patientId });
        this.engagement.likes = (this.engagement.likes || 0) + 1;
    }
    
    return this.save();
};

HealthTipSchema.methods.toggleBookmark = function(patientId) {
    const existingBookmark = this.interactions.bookmarkedBy.find(
        bookmark => bookmark.patient.toString() === patientId.toString()
    );
    
    if (existingBookmark) {
        // Remove bookmark
        this.interactions.bookmarkedBy.pull(existingBookmark._id);
        this.engagement.bookmarks = Math.max(0, (this.engagement.bookmarks || 1) - 1);
    } else {
        // Add bookmark
        this.interactions.bookmarkedBy.push({ patient: patientId });
        this.engagement.bookmarks = (this.engagement.bookmarks || 0) + 1;
    }
    
    return this.save();
};

HealthTipSchema.methods.isLikedBy = function(patientId) {
    return this.interactions.likedBy.some(
        like => like.patient.toString() === patientId.toString()
    );
};

HealthTipSchema.methods.isBookmarkedBy = function(patientId) {
    return this.interactions.bookmarkedBy.some(
        bookmark => bookmark.patient.toString() === patientId.toString()
    );
};

// Static methods
HealthTipSchema.statics.getPersonalizedTips = function(patientProfile, limit = 10) {
    const query = { status: 'published' };
    
    // Filter by age group
    if (patientProfile.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(patientProfile.dateOfBirth).getFullYear();
        if (age < 18) query['targetAudience.ageGroup'] = { $in: ['children', 'teens', 'all'] };
        else if (age >= 65) query['targetAudience.ageGroup'] = { $in: ['seniors', 'adults', 'all'] };
        else query['targetAudience.ageGroup'] = { $in: ['adults', 'all'] };
    }
    
    // Filter by gender
    if (patientProfile.gender) {
        query['targetAudience.gender'] = { $in: [patientProfile.gender, 'all'] };
    }
    
    return this.find(query)
        .sort({ featured: -1, 'engagement.views': -1, createdAt: -1 })
        .limit(limit);
};

HealthTipSchema.statics.getFeaturedTips = function(limit = 5) {
    return this.find({ status: 'published', featured: true })
        .sort({ 'engagement.views': -1, createdAt: -1 })
        .limit(limit);
};

HealthTipSchema.statics.getTipsByCategory = function(category, limit = 20) {
    return this.find({ status: 'published', category })
        .sort({ 'engagement.views': -1, createdAt: -1 })
        .limit(limit);
};

module.exports = mongoose.model("HealthTip", HealthTipSchema);