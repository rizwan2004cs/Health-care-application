// Authentication and authorization middleware

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    console.log('requireAuth - User:', req.user ? req.user.email : 'Not logged in');
    if (!req.user) {
        req.flash('error', 'Please log in to access this feature');
        return res.redirect('/patient/login');
    }
    next();
};

// Middleware to check if user belongs to patient portal
const requirePatientPortal = (req, res, next) => {
    console.log('requirePatientPortal - User:', req.user ? req.user.email : 'Not logged in', 'Portal:', req.user ? req.user.portal : 'N/A');
    if (!req.user) {
        req.flash('error', 'Please log in to access this feature');
        return res.redirect('/patient/login');
    }
    
    if (req.user.portal !== 'patient') {
        req.flash('error', 'Access denied. Patient portal access required.');
        return res.redirect('/patient/login');
    }
    next();
};

// Middleware to check if user belongs to doctor portal
const requireDoctorPortal = (req, res, next) => {
    if (!req.user) {
        req.flash('error', 'Please log in to access this feature');
        return res.redirect('/doctor/login');
    }
    
    if (req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor portal access required.');
        return res.redirect('/doctor/login');
    }
    next();
};

// Middleware to check if user belongs to admin portal
const requireAdminPortal = (req, res, next) => {
    if (!req.user) {
        req.flash('error', 'Please log in to access this feature');
        return res.redirect('/admin/login');
    }
    
    if (req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin portal access required.');
        return res.redirect('/admin/login');
    }
    next();
};

// Combined middleware for patient authentication
const requirePatientAuth = [requireAuth, requirePatientPortal];

// Combined middleware for doctor authentication
const requireDoctorAuth = [requireAuth, requireDoctorPortal];

// Combined middleware for admin authentication
const requireAdminAuth = [requireAuth, requireAdminPortal];

// Middleware to check if doctor is verified (for doctor routes)
const requireVerifiedDoctor = async (req, res, next) => {
    try {
        if (!req.user || req.user.portal !== 'doctor') {
            req.flash('error', 'Access denied. Doctor portal access required.');
            return res.redirect('/doctor/login');
        }
        
        const Doctor = require('../models/doctors');
        const doctor = await Doctor.findOne({ user: req.user._id });
        
        if (!doctor) {
            req.flash('error', 'Doctor profile not found.');
            return res.redirect('/doctor/login');
        }
        
        if (!doctor.isVerified) {
            req.flash('error', 'Your account is pending admin verification.');
            return res.redirect('/doctor/login');
        }
        
        // Add doctor profile to request for easy access
        req.doctorProfile = doctor;
        next();
    } catch (error) {
        console.error('Doctor verification error:', error);
        req.flash('error', 'Error verifying doctor status.');
        res.redirect('/doctor/login');
    }
};

// Middleware to get and attach patient profile to request
const attachPatientProfile = async (req, res, next) => {
    try {
        if (req.user && req.user.portal === 'patient') {
            const Patient = require('../models/patients');
            const patient = await Patient.findOne({ user: req.user._id });
            req.patientProfile = patient;
        }
        next();
    } catch (error) {
        console.error('Error attaching patient profile:', error);
        next(); // Continue even if profile fetch fails
    }
};

// Middleware to get and attach doctor profile to request
const attachDoctorProfile = async (req, res, next) => {
    try {
        if (req.user && req.user.portal === 'doctor') {
            const Doctor = require('../models/doctors');
            const doctor = await Doctor.findOne({ user: req.user._id });
            req.doctorProfile = doctor;
        }
        next();
    } catch (error) {
        console.error('Error attaching doctor profile:', error);
        next(); // Continue even if profile fetch fails
    }
};

// Middleware to get and attach admin profile to request
const attachAdminProfile = async (req, res, next) => {
    try {
        if (req.user && req.user.portal === 'admin') {
            const Admin = require('../models/admin');
            const admin = await Admin.findOne({ user: req.user._id });
            req.adminProfile = admin;
        }
        next();
    } catch (error) {
        console.error('Error attaching admin profile:', error);
        next(); // Continue even if profile fetch fails
    }
};

// Middleware for AJAX requests - returns JSON instead of redirect
const requireAuthAPI = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required',
            redirect: '/patient/login'
        });
    }
    next();
};

const requirePatientPortalAPI = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required',
            redirect: '/patient/login'
        });
    }
    
    if (req.user.portal !== 'patient') {
        return res.status(403).json({ 
            success: false, 
            error: 'Patient portal access required',
            redirect: '/patient/login'
        });
    }
    next();
};

// Combined API middleware
const requirePatientAuthAPI = [requireAuthAPI, requirePatientPortalAPI];

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const key = req.ip + (req.user ? req.user._id : '');
        const now = Date.now();
        
        if (!rateLimitMap.has(key)) {
            rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const limit = rateLimitMap.get(key);
        
        if (now > limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + windowMs;
            return next();
        }
        
        if (limit.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again later.'
            });
        }
        
        limit.count++;
        next();
    };
};

// Clean up rate limit map periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, limit] of rateLimitMap.entries()) {
        if (now > limit.resetTime) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = {
    requireAuth,
    requirePatientPortal,
    requireDoctorPortal,
    requireAdminPortal,
    requirePatientAuth,
    requireDoctorAuth,
    requireAdminAuth,
    requireVerifiedDoctor,
    attachPatientProfile,
    attachDoctorProfile,
    attachAdminProfile,
    requireAuthAPI,
    requirePatientPortalAPI,
    requirePatientAuthAPI,
    rateLimit
};