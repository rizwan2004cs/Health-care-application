const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/users.js");
const Patient = require("../models/patients.js");
const Doctor = require("../models/doctors.js");
const Admin = require("../models/admin.js");
const Appointment = require("../models/appointments.js");
const TestResult = require("../models/testResults.js");
const HealthTip = require("../models/healthTips.js");
const Prescription = require("../models/prescriptions.js");
const Settings = require("../models/settings.js");
const MedicationTracking = require("../models/medicationTracking.js");
const asyncWrap = require("../utils/asyncWrap.js");
const passport = require("passport");
const { 
    requirePatientAuth, 
    requireDoctorAuth, 
    requireAdminAuth,
    requireVerifiedDoctor,
    attachPatientProfile,
    requirePatientAuthAPI,
    rateLimit
} = require("../utils/authMiddleware.js");
const { generatePersonalizedHealthTips, generateHealthTipOnTopic } = require("../utils/groqHealthTips.js");

// Portal Selection Route
router.get("/portal-selection", (req, res) => {
    res.render("portal-selection.ejs");
});

// Debug route to check login status
router.get("/check-auth", (req, res) => {
    res.json({
        isAuthenticated: !!req.user,
        user: req.user ? {
            email: req.user.email,
            portal: req.user.portal,
            id: req.user._id
        } : null,
        session: req.session ? 'exists' : 'no session'
    });
});

router.get("/signup",(req,res) => {
    // Redirect to portal selection - users must choose a portal first
    res.redirect("/");
});

router.post("/signup", (req,res) => {
    // Redirect to portal selection - users must choose a portal first
    res.redirect("/");
});

router.get("/login",(req,res) => {
    // Redirect to portal selection - users must choose a portal first
    res.redirect("/");
})

// Portal-specific login routes
router.get("/patient/login",(req,res) => {
    res.render("users/login.ejs", { 
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null,
        portal: 'patient'
    });
});

router.get("/doctor/login",(req,res) => {
    res.render("users/login.ejs", { 
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null,
        portal: 'doctor'
    });
});

// Portal root redirects - redirect to login pages
router.get("/admin", (req, res) => {
    res.redirect("/admin/login");
});

router.get("/admin/", (req, res) => {
    res.redirect("/admin/login");
});

router.get("/patient", (req, res) => {
    res.redirect("/patient/login");
});

router.get("/patient/", (req, res) => {
    res.redirect("/patient/login");
});

router.get("/doctor", (req, res) => {
    res.redirect("/doctor/login");
});

router.get("/doctor/", (req, res) => {
    res.redirect("/doctor/login");
});

router.get("/admin/login",(req,res) => {
    res.render("users/login.ejs", { 
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null,
        portal: 'admin'
    });
});

router.post("/login", (req,res) => {
    // Redirect to portal selection - users must choose a portal first
    res.redirect("/");
});

// Portal-specific login POST routes
router.post("/patient/login", passport.authenticate("local", {
    failureRedirect: "/patient/login",
    failureFlash: "Incorrect username/email or password"
}), (req, res) => {
    // Verify that the user belongs to the patient portal
    if (req.user.portal !== 'patient') {
        req.flash('error', 'Access denied. Please use the correct portal.');
        return res.redirect("/patient/login");
    }
    req.flash('success', `Welcome back, ${req.user.username}!`);
    res.redirect("/dashboard");
});

router.post("/doctor/login", passport.authenticate("local", {
    failureRedirect: "/doctor/login",
    failureFlash: "Incorrect username/email or password"
}), asyncWrap(async (req, res) => {
    // Verify that the user belongs to the doctor portal
    if (req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Please use the correct portal.');
        return res.redirect("/doctor/login");
    }
    
    // Check if doctor is verified by admin
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
        req.flash('error', 'Doctor profile not found. Please contact support.');
        return res.redirect("/doctor/login");
    }
    
    if (!doctor.isVerified) {
        // Log out the user immediately
        req.logout((err) => {
            if (err) {
                console.error("Logout error:", err);
            }
            req.flash('error', 'Your account is pending admin verification. Please wait for approval before logging in.');
            return res.redirect("/doctor/login");
        });
        return;
    }
    
    req.flash('success', `Welcome back, ${req.user.username}!`);
    res.redirect("/dashboard");
}));

router.post("/admin/login", passport.authenticate("local", {
    failureRedirect: "/admin/login",
    failureFlash: "Incorrect username/email or password"
}), (req, res) => {
    // Verify that the user belongs to the admin portal
    if (req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Please use the correct portal.');
        return res.redirect("/admin/login");
    }
    req.flash('success', `Welcome back, ${req.user.username}!`);
    res.redirect("/dashboard");
});

// Portal-specific signup routes
router.get("/patient/signup",(req,res) => {
    res.render("users/signUp.ejs", { 
        errorMessage: req.flash('error')[0] || null,
        portal: 'patient'
    });
});

router.get("/doctor/signup",(req,res) => {
    res.render("users/signUp.ejs", { 
        errorMessage: req.flash('error')[0] || null,
        portal: 'doctor'
    });
});

// Admin should not have signup - redirect to login
router.get("/admin/signup",(req,res) => {
    req.flash('error', 'Admin accounts do not support self-registration. Please contact your administrator.');
    res.redirect("/admin/login");
});

router.post("/admin/signup", (req,res) => {
    req.flash('error', 'Admin accounts do not support self-registration. Please contact your administrator.');
    res.redirect("/admin/login");
});

// Portal-specific signup POST routes
router.post("/patient/signup", asyncWrap(async (req,res) => {
    await handlePortalSignup(req, res, 'patient');
}));

router.post("/doctor/signup", asyncWrap(async (req,res) => {
    await handlePortalSignup(req, res, 'doctor');
}));

// Helper function for portal-specific signup
async function handlePortalSignup(req, res, portal) {
    const { username, email, password, firstName, lastName, phone, dateOfBirth, gender } = req.body;
    
    // Validate that all required fields are present
    if (!username || !email || !password || !firstName || !lastName || !phone || !dateOfBirth || !gender) {
        req.flash('error', 'All fields are required');
        return res.redirect(`/${portal}/signup`);
    }
    
    // Additional validation
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
        req.flash('error', 'Phone number must be exactly 10 digits');
        return res.redirect(`/${portal}/signup`);
    }
    
    if (!gender || !['male', 'female', 'other'].includes(gender.toLowerCase())) {
        req.flash('error', 'Please select a valid gender');
        return res.redirect(`/${portal}/signup`);
    }
    
    const dateObj = new Date(dateOfBirth);
    if (isNaN(dateObj.getTime())) {
        req.flash('error', 'Please enter a valid date of birth');
        return res.redirect(`/${portal}/signup`);
    }
    
    try {
        // Check if user already exists with this email or username
        const existingUser = await User.findOne({ 
            $or: [{ email: email }, { username: username }] 
        });
        
        if (existingUser) {
            req.flash('error', 'User already exists with this email or username');
            return res.redirect(`/${portal}/signup`);
        }
        
        // First create and validate the profile data WITHOUT saving
        let profileData = {
            user: new mongoose.Types.ObjectId(), // Temporary ObjectId for validation
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            dateOfBirth: dateObj,
            gender: gender.toLowerCase()
        };
        
        let profile;
        switch (portal) {
            case 'patient':
                profile = new Patient(profileData);
                break;
            case 'doctor':
                profile = new Doctor(profileData);
                break;
            case 'admin':
                profileData.department = 'General';
                profileData.position = 'Staff';
                profileData.accessLevel = 'staff';
                profileData.employeeId = `EMP${Date.now()}`;
                profileData.employment = { joinDate: new Date() };
                profile = new Admin(profileData);
                break;
        }
        
        // Validate the profile WITHOUT saving to catch validation errors early
        const validationError = profile.validateSync();
        if (validationError) {
            const validationErrors = Object.values(validationError.errors).map(err => err.message);
            req.flash('error', `Please check your input: ${validationErrors.join(', ')}`);
            return res.redirect(`/${portal}/signup`);
        }
        
        // Now create the user (only if profile validation passed)
        const newUser = new User({ 
            email: email,
            username: username,
            portal: portal
        });
        
        // Register the user (creates the User record)
        let registeredUser = await User.register(newUser, password);
        
        // Update profile with actual user reference and save
        profile.user = registeredUser._id;
        
        try {
            await profile.save();
            console.log(`✅ ${portal} user created:`, registeredUser.email);
            console.log(`✅ ${portal} profile created successfully for:`, firstName, lastName);
        } catch (profileSaveError) {
            console.error(`❌ PROFILE SAVE ERROR for ${portal}:`, profileSaveError.message);
            console.error('Full error:', profileSaveError);
            
            // Delete the user if profile creation failed
            await User.findByIdAndDelete(registeredUser._id);
            
            req.flash('error', `Profile creation failed: ${profileSaveError.message}. Please try again.`);
            return res.redirect(`/${portal}/signup`);
        }
        
        // For doctors, don't auto-login - they need admin verification first
        if (portal === 'doctor') {
            req.flash('success', `Account created successfully, ${firstName}! Your registration is pending admin verification. You will be able to login once your account is approved.`);
            return res.redirect(`/${portal}/login`);
        }
        
        // Automatically log in the user after successful registration (for patients and admins only)
        req.login(registeredUser, (err) => {
            if (err) {
                console.error("Auto-login error:", err);
                req.flash('success', 'Account created successfully! Please log in.');
                return res.redirect(`/${portal}/login`);
            }
            
            req.flash('success', `Welcome to Healthcare App, ${firstName}!`);
            // Redirect to portal-specific detail collection page
            res.redirect(`/${portal}/complete-profile`);
        });
        
    } catch (error) {
        console.error("❌ SIGNUP ERROR:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
        
        // Handle specific mongoose validation errors
        if (error.name === 'UserExistsError') {
            req.flash('error', 'A user with the given email is already registered');
        } else if (error.name === 'ValidationError') {
            // Get specific validation error messages
            const validationErrors = Object.values(error.errors).map(err => err.message);
            req.flash('error', `Please check your input: ${validationErrors.join(', ')}`);
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        
        res.redirect(`/${portal}/signup`);
    }
}

// Profile completion routes
router.get("/patient/complete-profile", requirePatientAuth, asyncWrap(async (req, res) => {
    if (!req.user) {
        req.flash('error', 'Please log in to access your profile');
        return res.redirect('/patient/login');
    }
    
    // Get existing patient profile if any
    const patient = await Patient.findOne({ user: req.user._id });
    
    res.render("profiles/patient-profile.ejs", {
        user: req.user,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null,
        patient: patient || {}
    });
}));

router.get("/doctor/complete-profile", asyncWrap(async (req, res) => {
    if (!req.user) {
        req.flash('error', 'Please log in to access your profile');
        return res.redirect('/doctor/login');
    }
    
    // Get existing doctor profile if any
    const doctor = await Doctor.findOne({ user: req.user._id });
    
    res.render("profiles/doctor-profile.ejs", {
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null,
        doctor: doctor || {}
    });
}));

// Profile completion POST routes
router.post("/patient/complete-profile", requirePatientAuth, asyncWrap(async (req, res) => {
    try {
        if (!req.user) {
            req.flash('error', 'Please log in to complete your profile');
            return res.redirect('/patient/login');
        }
        
        console.log('Form data received:', req.body);
        
        // Structure the update data to match the patient schema
        const updateData = {};
        
        // Handle emergency contact data (form sends emergencyContact[field])
        if (req.body.emergencyContact) {
            if (req.body.emergencyContact.name) {
                updateData['healthProfile.emergencyContact.name'] = req.body.emergencyContact.name;
            }
            if (req.body.emergencyContact.relationship) {
                updateData['healthProfile.emergencyContact.relationship'] = req.body.emergencyContact.relationship;
            }
            if (req.body.emergencyContact.phone) {
                // Validate phone number format
                const phone = req.body.emergencyContact.phone.replace(/\D/g, '');
                if (phone.length === 10) {
                    updateData['healthProfile.emergencyContact.phone'] = phone;
                } else {
                    req.flash('error', 'Emergency contact phone must be exactly 10 digits');
                    return res.redirect('/patient/complete-profile');
                }
            }
        }
        
        // Handle health profile data (form sends healthProfile[field])
        if (req.body.healthProfile) {
            // Blood type
            if (req.body.healthProfile.bloodType) {
                updateData['healthProfile.bloodType'] = req.body.healthProfile.bloodType;
            }
            
            // Height (form sends healthProfile[height][value])
            if (req.body.healthProfile.height && req.body.healthProfile.height.value) {
                updateData['healthProfile.height.value'] = Number(req.body.healthProfile.height.value);
                updateData['healthProfile.height.unit'] = 'cm';
            }
            
            // Weight (form sends healthProfile[weight][value])
            if (req.body.healthProfile.weight && req.body.healthProfile.weight.value) {
                updateData['healthProfile.weight.value'] = Number(req.body.healthProfile.weight.value);
                updateData['healthProfile.weight.unit'] = 'kg';
            }
            
            // Vital Signs (form sends healthProfile[vitalSigns][field])
            if (req.body.healthProfile.vitalSigns) {
                // Set lastRecorded timestamp if any vital sign is provided
                const hasVitals = req.body.healthProfile.vitalSigns.heartRate || 
                                 req.body.healthProfile.vitalSigns.oxygenSaturation ||
                                 (req.body.healthProfile.vitalSigns.bloodPressure && 
                                  (req.body.healthProfile.vitalSigns.bloodPressure.systolic || 
                                   req.body.healthProfile.vitalSigns.bloodPressure.diastolic));
                
                if (hasVitals) {
                    updateData['healthProfile.vitalSigns.lastRecorded'] = new Date();
                }
                
                if (req.body.healthProfile.vitalSigns.heartRate) {
                    updateData['healthProfile.vitalSigns.heartRate'] = Number(req.body.healthProfile.vitalSigns.heartRate);
                }
                
                if (req.body.healthProfile.vitalSigns.oxygenSaturation) {
                    updateData['healthProfile.vitalSigns.oxygenSaturation'] = Number(req.body.healthProfile.vitalSigns.oxygenSaturation);
                }
                
                if (req.body.healthProfile.vitalSigns.bloodPressure) {
                    if (req.body.healthProfile.vitalSigns.bloodPressure.systolic) {
                        updateData['healthProfile.vitalSigns.bloodPressure.systolic'] = Number(req.body.healthProfile.vitalSigns.bloodPressure.systolic);
                    }
                    if (req.body.healthProfile.vitalSigns.bloodPressure.diastolic) {
                        updateData['healthProfile.vitalSigns.bloodPressure.diastolic'] = Number(req.body.healthProfile.vitalSigns.bloodPressure.diastolic);
                    }
                }
            }
            
            // Lifestyle (form sends healthProfile[lifestyle][field])
            if (req.body.healthProfile.lifestyle) {
                if (req.body.healthProfile.lifestyle.smokingStatus) {
                    updateData['healthProfile.lifestyle.smokingStatus'] = req.body.healthProfile.lifestyle.smokingStatus;
                }
                if (req.body.healthProfile.lifestyle.alcoholConsumption) {
                    updateData['healthProfile.lifestyle.alcoholConsumption'] = req.body.healthProfile.lifestyle.alcoholConsumption;
                }
                if (req.body.healthProfile.lifestyle.exerciseFrequency) {
                    updateData['healthProfile.lifestyle.exerciseFrequency'] = req.body.healthProfile.lifestyle.exerciseFrequency;
                }
            }
        }
        
        // Handle preferences (form sends preferences[field])
        if (req.body.preferences) {
            if (req.body.preferences.preferredLanguage) {
                updateData['preferences.preferredLanguage'] = req.body.preferences.preferredLanguage;
            }
            if (req.body.preferences.communicationMethod) {
                updateData['preferences.communicationMethod'] = req.body.preferences.communicationMethod;
            }
            // Handle checkboxes - they send 'on' when checked, undefined when unchecked
            updateData['preferences.appointmentReminders'] = req.body.preferences && req.body.preferences.appointmentReminders === 'on';
            updateData['preferences.healthTips'] = req.body.preferences && req.body.preferences.healthTips === 'on';
        }
        
        // Handle text fields for allergies and medical history (these can be processed later)
        if (req.body.allergiesText && req.body.allergiesText.trim()) {
            // For now, we'll store this as a simple note - later it can be parsed into structured data
            updateData['healthProfile.allergiesNote'] = req.body.allergiesText.trim();
        }
        
        if (req.body.medicalHistoryText && req.body.medicalHistoryText.trim()) {
            // For now, we'll store this as a simple note - later it can be parsed into structured data
            updateData['healthProfile.medicalHistoryNote'] = req.body.medicalHistoryText.trim();
        }
        
        console.log('Structured update data:', updateData);
        
        // Find patient profile by user reference and update
        const patient = await Patient.findOneAndUpdate(
            { user: req.user._id }, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );
        
        if (!patient) {
            req.flash('error', 'Patient profile not found');
            return res.redirect('/patient/complete-profile');
        }
        
        console.log('Updated patient:', patient);
        req.flash('success', 'Your health profile has been completed successfully!');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Profile completion error:', error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            req.flash('error', `Validation error: ${validationErrors.join(', ')}`);
        } else {
            req.flash('error', 'Error updating profile. Please try again.');
        }
        res.redirect('/patient/complete-profile');
    }
}));

router.post("/doctor/complete-profile", asyncWrap(async (req, res) => {
    try {
        if (!req.user) {
            req.flash('error', 'Please log in to complete your profile');
            return res.redirect('/doctor/login');
        }
        
        const updateData = req.body;
        // Find doctor profile by user reference
        const doctor = await Doctor.findOneAndUpdate(
            { user: req.user._id }, 
            updateData, 
            { new: true }
        );
        
        if (!doctor) {
            req.flash('error', 'Doctor profile not found');
            return res.redirect('/doctor/complete-profile');
        }
        
        req.flash('success', 'Your professional profile has been submitted for verification!');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Profile completion error:', error);
        req.flash('error', 'Error updating profile. Please try again.');
        res.redirect('/doctor/complete-profile');
    }
}));

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You are logged out!');
        //redirect to portal selection page
        res.redirect("/");
    });
});

// Portal-specific logout routes
router.get("/patient/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You are logged out!');
        res.redirect("/patient/login");
    });
});

router.get("/doctor/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You are logged out!');
        res.redirect("/doctor/login");
    });
});

router.get("/admin/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You are logged out!');
        res.redirect("/admin/login");
    });
});

// Dashboard route
// Main dashboard router - redirects to portal-specific dashboards
router.get("/dashboard", asyncWrap(async (req, res) => {
    if (!req.user) {
        req.flash('error', 'Please log in to access the dashboard');
        return res.redirect('/');
    }
    
    // Redirect to portal-specific dashboard
    switch (req.user.portal) {
        case 'patient':
            return res.redirect('/patient/dashboard');
        case 'doctor':
            return res.redirect('/doctor/dashboard');
        case 'admin':
            return res.redirect('/admin/dashboard');
        default:
            return res.redirect('/');
    }
}));

// Patient Dashboard
router.get("/patient/dashboard", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    if (!req.patientProfile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/patient/complete-profile');
    }
    
    // Auto-generate health tips if patient has fewer than 5 personalized tips
    // Only generate once per patient, not on every dashboard visit
    try {
        // Check if patient already has generated tips in the database
        const existingPatientTips = await HealthTip.countDocuments({
            status: 'published',
            'metadata.generatedForPatient': req.patientProfile._id
        });
        
        // Only generate tips if this patient doesn't have any generated tips yet
        if (existingPatientTips === 0) {
            console.log(`Generating initial health tips for new patient ${req.patientProfile._id}`);
            
            const tipsNeeded = 5;
            const generatedTips = await generatePersonalizedHealthTips(req.patientProfile, tipsNeeded);
            
            // Save generated tips to database with patient reference
            for (const tipData of generatedTips) {
                const healthTip = new HealthTip({
                    ...tipData,
                    metadata: {
                        ...tipData.metadata,
                        generatedForPatient: req.patientProfile._id,
                        generatedAt: new Date()
                    }
                });
                await healthTip.save();
            }
            
            console.log(`Successfully generated ${generatedTips.length} health tips for patient (one-time generation)`);
        }
    } catch (error) {
        console.error('Error auto-generating health tips on dashboard:', error);
        // Continue with dashboard rendering even if auto-generation fails
    }
    
    // Fetch upcoming appointments for the patient
    const upcomingAppointments = await Appointment.find({
        patient: req.patientProfile._id,
        appointmentDate: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] }
    })
    .populate('doctor', 'firstName lastName specialization currentHospital address')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .limit(5);
    
    // Fetch active prescriptions for the patient
    const activePrescriptions = await Prescription.find({
        patient: req.patientProfile._id,
        status: 'active'
    })
    .populate('doctor', 'firstName lastName specialization')
    .sort({ prescriptionDate: -1 })
    .limit(10);
    
    // Get or create today's medication tracking
    const todayTracking = await MedicationTracking.getTodayTracking(req.patientProfile._id);
    
    return res.render("dashboards/patient-dashboard.ejs", {
        user: req.user,
        profile: req.patientProfile,
        appointments: upcomingAppointments,
        prescriptions: activePrescriptions,
        medicationTracking: todayTracking,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor Dashboard
router.get("/doctor/dashboard", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAppointments = await Appointment.countDocuments({
        doctor: profile._id,
        appointmentDate: {
            $gte: today,
            $lt: tomorrow
        },
        status: { $in: ['scheduled', 'confirmed'] }
    });
    
    // Get appointments for display (today and upcoming)
    const appointments = await Appointment.find({
        doctor: profile._id,
        appointmentDate: { $gte: today },
        status: { $in: ['scheduled', 'confirmed'] }
    })
    .populate('patient', 'firstName lastName age bloodGroup')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .limit(5);
    
    // Get total patients count - count unique patients from all appointments
    const uniquePatients = await Appointment.distinct('patient', { 
        doctor: profile._id 
    });
    const totalPatients = uniquePatients.length;
    
    // Get this month's prescriptions count
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prescriptionsCount = await Prescription.countDocuments({
        doctor: profile._id,
        prescriptionDate: { $gte: firstDayOfMonth }
    });
    
    // Get recent patients (from recent appointments)
    const recentAppointments = await Appointment.find({
        doctor: profile._id,
        status: 'completed'
    })
    .populate('patient', 'firstName lastName age bloodGroup')
    .sort({ appointmentDate: -1 })
    .limit(5);
    
    const recentPatients = recentAppointments
        .map(apt => apt.patient)
        .filter((patient, index, self) => 
            patient && index === self.findIndex(p => p && p._id.toString() === patient._id.toString())
        )
        .slice(0, 5);
    
    return res.render("dashboards/doctor-dashboard.ejs", {
        user: req.user,
        profile: profile,
        todayAppointments: todayAppointments,
        appointments: appointments,
        totalPatients: totalPatients,
        prescriptionsCount: prescriptionsCount,
        recentPatients: recentPatients,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor Appointments Page
router.get("/doctor/appointments", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get all appointments for this doctor
    const appointments = await Appointment.find({ doctor: profile._id })
        .populate('patient', 'firstName lastName age bloodGroup phone')
        .sort({ appointmentDate: -1, appointmentTime: -1 });
    
    return res.render("doctor/appointments.ejs", {
        user: req.user,
        profile: profile,
        appointments: appointments,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor Appointment Details Page
router.get("/doctor/appointments/:id", asyncWrap(async (req, res) => {
    try {
        console.log('=== APPOINTMENT DETAILS ROUTE HIT ===');
        console.log('Appointment ID:', req.params.id);
        console.log('User session:', req.session);
        console.log('User:', req.user ? req.user.email : 'Not logged in');
        console.log('User portal:', req.user ? req.user.portal : 'N/A');
        
        if (!req.user) {
            console.log('❌ No user in session - redirecting to login');
            req.flash('error', 'Please log in to view appointments');
            return res.redirect('/doctor/login');
        }
        
        if (req.user.portal !== 'doctor') {
            console.log('❌ User is not a doctor - portal:', req.user.portal);
            req.flash('error', 'Access denied. Doctor access required.');
            return res.redirect('/doctor/login');
        }
        
        const profile = await Doctor.findOne({ user: req.user._id });
        console.log('Doctor profile found:', profile ? profile.firstName + ' ' + profile.lastName : 'None');
        
        if (!profile) {
            console.log('❌ No doctor profile');
            req.flash('error', 'Please complete your profile first');
            return res.redirect('/doctor/complete-profile');
        }
        
        // Get appointment details
        const appointment = await Appointment.findById(req.params.id)
            .populate({
                path: 'patient',
                populate: {
                    path: 'user',
                    select: 'email username'
                }
            })
            .populate('doctor');
        
        console.log('Appointment found:', appointment ? 'Yes' : 'No');
        
        if (!appointment) {
            console.log('❌ Appointment not found in database');
            req.flash('error', 'Appointment not found');
            return res.redirect('/doctor/appointments');
        }
        
        console.log('Appointment doctor ID:', appointment.doctor._id.toString());
        console.log('Current doctor ID:', profile._id.toString());
        
        // Verify this appointment belongs to this doctor
        if (appointment.doctor._id.toString() !== profile._id.toString()) {
            console.log('❌ Access denied - wrong doctor');
            req.flash('error', 'Access denied to this appointment');
            return res.redirect('/doctor/appointments');
        }
        
        console.log('✅ Rendering appointment-details.ejs');
        
        return res.render("doctor/appointment-details.ejs", {
            user: req.user,
            profile: profile,
            appointment: appointment,
            errorMessage: req.flash('error')[0] || null,
            successMessage: req.flash('success')[0] || null
        });
    } catch (error) {
        console.error('❌ Error in appointment details route:', error);
        console.error('Stack:', error.stack);
        req.flash('error', 'An error occurred loading the appointment');
        return res.redirect('/doctor/appointments');
    }
}));

// Save Appointment Notes (API)
router.post("/doctor/appointments/:id/notes", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        return res.status(403).json({ success: false, error: 'Doctor profile not found' });
    }
    
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    // Verify this appointment belongs to this doctor
    if (appointment.doctor.toString() !== profile._id.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied to this appointment' });
    }
    
    appointment.notes = req.body.notes;
    await appointment.save();
    
    return res.json({ success: true, message: 'Notes saved successfully' });
}));

// Complete Appointment (API)
router.post("/doctor/appointments/:id/complete", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        return res.status(403).json({ success: false, error: 'Doctor profile not found' });
    }
    
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    // Verify this appointment belongs to this doctor
    if (appointment.doctor.toString() !== profile._id.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied to this appointment' });
    }
    
    appointment.status = 'completed';
    
    // Add to history if the field exists
    if (!appointment.history) {
        appointment.history = [];
    }
    appointment.history.push({
        action: 'Appointment marked as completed',
        date: new Date(),
        user: req.user._id
    });
    
    await appointment.save();
    
    return res.json({ success: true, message: 'Appointment completed successfully' });
}));

// Cancel Appointment (API)
router.post("/doctor/appointments/:id/cancel", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        return res.status(403).json({ success: false, error: 'Doctor profile not found' });
    }
    
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    // Verify this appointment belongs to this doctor
    if (appointment.doctor.toString() !== profile._id.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied to this appointment' });
    }
    
    appointment.status = 'cancelled';
    
    // Add to history if the field exists
    if (!appointment.history) {
        appointment.history = [];
    }
    appointment.history.push({
        action: `Appointment cancelled by doctor. Reason: ${req.body.reason || 'No reason provided'}`,
        date: new Date(),
        user: req.user._id
    });
    
    await appointment.save();
    
    return res.json({ success: true, message: 'Appointment cancelled successfully' });
}));

// Doctor Patients Page
router.get("/doctor/patients", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get all patients who have had appointments with this doctor
    const appointments = await Appointment.find({ doctor: profile._id })
        .populate('patient')
        .select('patient');
    
    // Extract unique patients
    const patientIds = [...new Set(appointments.map(apt => apt.patient?._id?.toString()).filter(Boolean))];
    
    const patients = await Patient.find({ _id: { $in: patientIds } });
    
    // Get appointment counts for each patient
    for (let patient of patients) {
        const aptCount = await Appointment.countDocuments({
            doctor: profile._id,
            patient: patient._id
        });
        patient.appointmentCount = aptCount;
    }
    
    return res.render("doctor/patients.ejs", {
        user: req.user,
        profile: profile,
        patients: patients,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor Patient Details Page
router.get("/doctor/patients/:id", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get patient details
    const patient = await Patient.findById(req.params.id).populate('user');
    
    if (!patient) {
        req.flash('error', 'Patient not found');
        return res.redirect('/doctor/patients');
    }
    
    // Get all appointments for this patient with this doctor
    const appointments = await Appointment.find({ 
        doctor: profile._id, 
        patient: patient._id 
    }).sort({ date: -1 });
    
    // Get prescriptions for this patient
    const Prescription = require('../models/prescriptions');
    const prescriptions = await Prescription.find({ 
        doctor: profile._id, 
        patient: patient._id 
    }).sort({ createdAt: -1 }).limit(10);
    
    // Get test results if available
    const TestResult = require('../models/testResults');
    const testResults = await TestResult.find({ 
        patient: patient._id 
    }).sort({ testDate: -1 }).limit(10);
    
    return res.render("doctor/patient-details.ejs", {
        user: req.user,
        profile: profile,
        patient: patient,
        appointments: appointments,
        prescriptions: prescriptions,
        testResults: testResults,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor Prescriptions Page
router.get("/doctor/prescriptions", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get all prescriptions for this doctor
    const prescriptions = await Prescription.find({ doctor: profile._id })
        .populate('patient', 'firstName lastName patientId')
        .sort({ prescriptionDate: -1 });
    
    return res.render("doctor/prescriptions.ejs", {
        title: 'Prescriptions',
        user: req.user,
        profile: profile,
        prescriptions: prescriptions,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor New Prescription Page
router.get("/doctor/prescriptions/new", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get patient and appointment if provided in query params
    let patient = null;
    let appointment = null;
    
    if (req.query.patient) {
        patient = await Patient.findById(req.query.patient);
    }
    
    if (req.query.appointment) {
        appointment = await Appointment.findById(req.query.appointment)
            .populate('patient');
        if (appointment && !patient) {
            patient = appointment.patient;
        }
    }
    
    // Get all patients for this doctor if no specific patient
    const appointments = await Appointment.find({ doctor: profile._id })
        .populate('patient')
        .select('patient');
    
    const patientIds = [...new Set(appointments.map(apt => apt.patient?._id?.toString()).filter(Boolean))];
    const patients = await Patient.find({ _id: { $in: patientIds } });
    
    return res.render("doctor/new-prescription.ejs", {
        title: 'New Prescription',
        user: req.user,
        profile: profile,
        patient: patient,
        appointment: appointment,
        patients: patients,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Create Prescription (API)
router.post("/doctor/prescriptions/create", asyncWrap(async (req, res) => {
    try {
        if (!req.user || req.user.portal !== 'doctor') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const profile = await Doctor.findOne({ user: req.user._id });
        
        if (!profile) {
            return res.status(403).json({ success: false, error: 'Doctor profile not found' });
        }
        
        // Validate patient exists
        const patient = await Patient.findById(req.body.patientId);
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        // Parse medications array - ensure it's properly formatted
        let medications = [];
        if (req.body.medications && Array.isArray(req.body.medications)) {
            medications = req.body.medications.map(med => ({
                name: med.name,
                genericName: med.genericName || '',
                strength: med.strength || 'Not specified',
                dosageForm: med.dosageForm || 'tablet',
                dosage: {
                    frequency: med.frequency || 'As directed',
                    quantity: med.quantity || '1 unit',
                    timing: med.timing || 'anytime',
                    duration: med.duration || '7 days'
                },
                instructions: med.instructions || ''
            }));
        }
        
        if (medications.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one medication is required' });
        }
        
        // Calculate valid until date (default 30 days from now)
        const validUntil = req.body.validUntil ? new Date(req.body.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        // Create prescription with proper schema structure
        const prescription = new Prescription({
            doctor: profile._id,
            patient: req.body.patientId,
            diagnosis: {
                primary: req.body.diagnosis || 'General consultation'
            },
            medications: medications,
            instructions: {
                general: req.body.notes || ''
            },
            prescriptionDate: req.body.prescriptionDate ? new Date(req.body.prescriptionDate) : new Date(),
            validUntil: validUntil
        });
        
        await prescription.save();
        
        req.flash('success', 'Prescription created successfully');
        return res.json({ success: true, prescriptionId: prescription._id });
    } catch (error) {
        console.error('Error creating prescription:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create prescription'
        });
    }
}));

// Prescription Details Page
router.get("/doctor/prescriptions/:id", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id }).populate('user');
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get prescription details
    const prescription = await Prescription.findById(req.params.id)
        .populate('patient', 'firstName lastName age gender bloodGroup phone address')
        .populate('doctor', 'firstName lastName specialization licenseNumber');
    
    if (!prescription) {
        req.flash('error', 'Prescription not found');
        return res.redirect('/doctor/prescriptions');
    }
    
    // Verify this prescription belongs to this doctor
    if (prescription.doctor._id.toString() !== profile._id.toString()) {
        req.flash('error', 'Access denied');
        return res.redirect('/doctor/prescriptions');
    }
    
    return res.render("doctor/prescription-details.ejs", {
        title: 'Prescription Details',
        user: req.user,
        profile: profile,
        prescription: prescription,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Prescription Print Page
router.get("/doctor/prescriptions/:id/print", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id }).populate('user');
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get prescription details
    const prescription = await Prescription.findById(req.params.id)
        .populate('patient')
        .populate('doctor');
    
    if (!prescription) {
        req.flash('error', 'Prescription not found');
        return res.redirect('/doctor/prescriptions');
    }
    
    // Verify this prescription belongs to this doctor
    if (prescription.doctor._id.toString() !== profile._id.toString()) {
        req.flash('error', 'Access denied');
        return res.redirect('/doctor/prescriptions');
    }
    
    return res.render("doctor/prescription-print.ejs", {
        title: 'Print Prescription',
        user: req.user,
        profile: profile,
        prescription: prescription,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor Test Results - New Test Result Form
router.get("/doctor/test-results/new", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get patient ID from query parameter
    const patientId = req.query.patient;
    if (!patientId) {
        req.flash('error', 'Patient ID is required');
        return res.redirect('/doctor/patients');
    }
    
    // Get patient details
    const patient = await Patient.findById(patientId);
    if (!patient) {
        req.flash('error', 'Patient not found');
        return res.redirect('/doctor/patients');
    }
    
    return res.render("doctor/new-test-result.ejs", {
        user: req.user,
        profile: profile,
        patient: patient,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Doctor Test Results - Create Test Result
router.post("/doctor/test-results/create", asyncWrap(async (req, res) => {
    try {
        if (!req.user || req.user.portal !== 'doctor') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const profile = await Doctor.findOne({ user: req.user._id });
        
        if (!profile) {
            return res.status(403).json({ success: false, error: 'Doctor profile not found' });
        }
        
        // Validate patient exists
        const patient = await Patient.findById(req.body.patientId);
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        // Parse test parameters
        let parameters = [];
        if (req.body.parameters && Array.isArray(req.body.parameters)) {
            parameters = req.body.parameters.map(param => ({
                name: param.name,
                value: param.value,
                unit: param.unit || '',
                normalRange: param.normalRange || '',
                status: param.status || 'normal'
            }));
        }
        
        // Create test result
        const testResult = new TestResult({
            patient: req.body.patientId,
            doctor: profile._id,
            testType: req.body.testType,
            testName: req.body.testName,
            testDate: req.body.testDate ? new Date(req.body.testDate) : new Date(),
            reportDate: new Date(),
            labName: req.body.labName || 'In-house',
            status: 'completed',
            priority: req.body.priority || 'routine',
            results: {
                summary: req.body.summary || 'Test completed',
                interpretation: req.body.interpretation || '',
                normalRange: req.body.normalRange || '',
                units: req.body.units || ''
            },
            parameters: parameters,
            notes: req.body.notes || '',
            interpretation: req.body.interpretation || '',
            recommendations: req.body.recommendations || ''
        });
        
        await testResult.save();
        
        req.flash('success', 'Test result added successfully');
        return res.json({ success: true, testResultId: testResult._id });
    } catch (error) {
        console.error('Error creating test result:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create test result'
        });
    }
}));

// Doctor Schedule Page
router.get("/doctor/schedule", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    return res.render("doctor/schedule.ejs", {
        title: 'Schedule Management',
        user: req.user,
        profile: profile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Update Doctor Schedule
router.post("/doctor/schedule/update", asyncWrap(async (req, res) => {
    try {
        if (!req.user || req.user.portal !== 'doctor') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const profile = await Doctor.findOne({ user: req.user._id });
        
        if (!profile) {
            return res.status(404).json({ success: false, error: 'Doctor profile not found' });
        }
        
        // Extract schedule data from request body
        const { schedule, consultationFee } = req.body;
        
        // Update consultation fee if provided
        if (consultationFee) {
            if (consultationFee.inPerson !== undefined) {
                profile.consultationFee.inPerson = Number(consultationFee.inPerson);
            }
            if (consultationFee.video !== undefined) {
                profile.consultationFee.video = Number(consultationFee.video);
            }
            if (consultationFee.followUp !== undefined) {
                profile.consultationFee.followUp = Number(consultationFee.followUp);
            }
        }
        
        // Update schedule if provided
        if (schedule && Array.isArray(schedule)) {
            profile.availability.schedule = schedule.map(day => ({
                dayOfWeek: day.dayOfWeek.toLowerCase(),
                shifts: day.shifts.map(shift => ({
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    slotDuration: shift.slotDuration || 30,
                    maxPatients: shift.maxPatients || 20
                }))
            }));
        }
        
        await profile.save();
        
        return res.json({ 
            success: true, 
            message: 'Schedule updated successfully' 
        });
        
    } catch (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to update schedule. Please try again.' 
        });
    }
}));

// Add Unavailable Date
router.post("/doctor/schedule/add-unavailable", asyncWrap(async (req, res) => {
    try {
        if (!req.user || req.user.portal !== 'doctor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const profile = await Doctor.findOne({ user: req.user._id });
        
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Doctor profile not found' });
        }
        
        const { date, reason } = req.body;
        
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }
        
        // Initialize availability if not exists
        if (!profile.availability) {
            profile.availability = {
                schedule: [],
                unavailableDates: [],
                leaveRequests: []
            };
        }
        
        if (!profile.availability.unavailableDates) {
            profile.availability.unavailableDates = [];
        }
        
        // Check if date already exists
        const existingDate = profile.availability.unavailableDates.find(
            item => new Date(item.date).toDateString() === new Date(date).toDateString()
        );
        
        if (existingDate) {
            return res.status(400).json({ success: false, message: 'This date is already marked as unavailable' });
        }
        
        // Add unavailable date
        profile.availability.unavailableDates.push({
            date: new Date(date),
            reason: reason || 'Not available'
        });
        
        await profile.save();
        
        return res.json({ 
            success: true, 
            message: 'Date marked as unavailable successfully' 
        });
        
    } catch (error) {
        console.error('Error adding unavailable date:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to mark date as unavailable. Please try again.' 
        });
    }
}));

// Remove Unavailable Date
router.post("/doctor/schedule/remove-unavailable/:dateId", asyncWrap(async (req, res) => {
    try {
        if (!req.user || req.user.portal !== 'doctor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const profile = await Doctor.findOne({ user: req.user._id });
        
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Doctor profile not found' });
        }
        
        const { dateId } = req.params;
        
        if (!profile.availability || !profile.availability.unavailableDates) {
            return res.status(404).json({ success: false, message: 'No unavailable dates found' });
        }
        
        // Remove the unavailable date
        profile.availability.unavailableDates = profile.availability.unavailableDates.filter(
            item => item._id.toString() !== dateId
        );
        
        await profile.save();
        
        return res.json({ 
            success: true, 
            message: 'Unavailable date removed successfully' 
        });
        
    } catch (error) {
        console.error('Error removing unavailable date:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to remove unavailable date. Please try again.' 
        });
    }
}));

// Doctor Profile View Page
router.get("/doctor/profile", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'doctor') {
        req.flash('error', 'Access denied. Doctor access required.');
        return res.redirect('/doctor/login');
    }
    
    const profile = await Doctor.findOne({ user: req.user._id }).populate('user');
    
    if (!profile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/doctor/complete-profile');
    }
    
    // Get statistics
    const totalAppointments = await Appointment.countDocuments({ doctor: profile._id });
    const completedAppointments = await Appointment.countDocuments({ 
        doctor: profile._id, 
        status: 'completed' 
    });
    const totalPatients = await Appointment.distinct('patient', { doctor: profile._id }).then(arr => arr.length);
    
    return res.render("doctor/profile-view.ejs", {
        user: req.user,
        profile: profile,
        stats: {
            totalAppointments,
            completedAppointments,
            totalPatients
        },
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Admin Dashboard
router.get("/admin/dashboard", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const profile = await Admin.findOne({ user: req.user._id });
    
    // Get real statistics from database
    const totalPatients = await Patient.countDocuments();
    const totalDoctors = await Doctor.countDocuments({ isVerified: true });
    const pendingDoctors = await Doctor.find({ isVerified: false })
        .populate('user', 'username email')
        .sort({ registrationDate: -1 });
    
    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointmentsToday = await Appointment.countDocuments({
        appointmentDate: {
            $gte: today,
            $lt: tomorrow
        }
    });
    
    // Get recent appointments for activity feed
    const recentAppointments = await Appointment.find()
        .populate('patient', 'firstName lastName')
        .populate('doctor', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);
    
    // Get recent patients
    const recentPatients = await Patient.find()
        .populate('user', 'username')
        .sort({ createdAt: -1 })
        .limit(3);
    
    // Get recent health tips
    const recentHealthTips = await HealthTip.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(2);
    
    return res.render("dashboards/admin-dashboard.ejs", {
        user: req.user,
        profile: profile,
        totalPatients,
        totalDoctors,
        appointmentsToday,
        pendingDoctors,
        recentAppointments,
        recentPatients,
        recentHealthTips,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Admin routes for doctor verification
router.post("/admin/verify-doctor/:doctorId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const { doctorId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    try {
        const doctor = await Doctor.findById(doctorId).populate('user', 'username email');
        
        if (!doctor) {
            req.flash('error', 'Doctor not found.');
            return res.redirect('/admin/dashboard');
        }
        
        if (action === 'approve') {
            doctor.isVerified = true;
            await doctor.save();
            req.flash('success', `Doctor ${doctor.firstName} ${doctor.lastName} has been approved and can now login.`);
        } else if (action === 'reject') {
            // For now, we'll just keep them unverified
            // In the future, you might want to add a rejection reason or delete the account
            req.flash('success', `Doctor ${doctor.firstName} ${doctor.lastName} verification has been rejected.`);
        }
        
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Doctor verification error:', error);
        req.flash('error', 'Error processing verification. Please try again.');
        res.redirect('/admin/dashboard');
    }
}));

// Route to get pending doctors list (AJAX endpoint)
router.get("/admin/pending-doctors", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const pendingDoctors = await Doctor.find({ isVerified: false })
        .populate('user', 'username email')
        .sort({ registrationDate: -1 });
    
    res.json(pendingDoctors);
}));

// ================================
// ADMIN PATIENT MANAGEMENT
// ================================

// View all patients
router.get("/admin/patients", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const { search, gender, sortBy } = req.query;
    let query = {};
    
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }
    
    if (gender && gender !== 'all') {
        query.gender = gender;
    }
    
    let sortOptions = { createdAt: -1 }; // Default: newest first
    if (sortBy === 'name') sortOptions = { firstName: 1, lastName: 1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
    
    const patients = await Patient.find(query)
        .populate('user', 'username email')
        .sort(sortOptions);
    
    const totalPatients = await Patient.countDocuments();
    const maleCount = await Patient.countDocuments({ gender: 'male' });
    const femaleCount = await Patient.countDocuments({ gender: 'female' });
    
    res.render("admin/patients.ejs", {
        user: req.user,
        patients,
        totalPatients,
        maleCount,
        femaleCount,
        filters: { search, gender, sortBy },
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// View patient details
router.get("/admin/patients/view/:patientId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const patient = await Patient.findById(req.params.patientId)
        .populate('user', 'username email');
    
    if (!patient) {
        req.flash('error', 'Patient not found.');
        return res.redirect('/admin/patients');
    }
    
    // Get patient's appointments
    const appointments = await Appointment.find({ patient: req.params.patientId })
        .populate('doctor', 'firstName lastName specialization')
        .sort({ appointmentDate: -1 })
        .limit(10);
    
    // Get patient's prescriptions
    const prescriptions = await Prescription.find({ patient: req.params.patientId })
        .populate('doctor', 'firstName lastName')
        .sort({ prescriptionDate: -1 })
        .limit(5);
    
    // Get patient's test results
    const testResults = await TestResult.find({ patient: req.params.patientId })
        .sort({ testDate: -1 })
        .limit(5);
    
    res.render("admin/patient-details.ejs", {
        user: req.user,
        patient,
        appointments,
        prescriptions,
        testResults,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Delete patient
router.post("/admin/patients/delete/:patientId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) {
        req.flash('error', 'Patient not found.');
        return res.redirect('/admin/patients');
    }
    
    // Delete associated user account
    await User.findByIdAndDelete(patient.user);
    // Delete patient profile
    await Patient.findByIdAndDelete(req.params.patientId);
    // Delete associated appointments
    await Appointment.deleteMany({ patient: req.params.patientId });
    
    req.flash('success', 'Patient deleted successfully.');
    res.redirect('/admin/patients');
}));

// ================================
// ADMIN DOCTOR MANAGEMENT
// ================================

// View all doctors
router.get("/admin/doctors", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const { search, specialty, status, sortBy } = req.query;
    let query = {};
    
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { specialization: { $regex: search, $options: 'i' } },
            { currentHospital: { $regex: search, $options: 'i' } }
        ];
    }
    
    if (specialty && specialty !== 'all') {
        query.specialization = specialty;
    }
    
    if (status === 'verified') {
        query.isVerified = true;
    } else if (status === 'pending') {
        query.isVerified = false;
    }
    
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'name') sortOptions = { firstName: 1, lastName: 1 };
    if (sortBy === 'experience') sortOptions = { experience: -1 };
    if (sortBy === 'rating') sortOptions = { 'ratings.overall': -1 };
    
    const doctors = await Doctor.find(query)
        .populate('user', 'username email')
        .sort(sortOptions);
    
    const specializations = await Doctor.distinct('specialization');
    const totalDoctors = await Doctor.countDocuments();
    const verifiedCount = await Doctor.countDocuments({ isVerified: true });
    const pendingCount = await Doctor.countDocuments({ isVerified: false });
    
    res.render("admin/doctors.ejs", {
        user: req.user,
        doctors,
        specializations,
        totalDoctors,
        verifiedCount,
        pendingCount,
        filters: { search, specialty, status, sortBy },
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// View doctor details
router.get("/admin/doctors/view/:doctorId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const doctor = await Doctor.findById(req.params.doctorId)
        .populate('user', 'username email');
    
    if (!doctor) {
        req.flash('error', 'Doctor not found.');
        return res.redirect('/admin/doctors');
    }
    
    // Get doctor's appointments
    const appointments = await Appointment.find({ doctor: req.params.doctorId })
        .populate('patient', 'firstName lastName phone')
        .sort({ appointmentDate: -1 })
        .limit(10);
    
    // Get statistics
    const totalAppointments = await Appointment.countDocuments({ doctor: req.params.doctorId });
    const completedAppointments = await Appointment.countDocuments({ doctor: req.params.doctorId, status: 'completed' });
    
    res.render("admin/doctor-details.ejs", {
        user: req.user,
        doctor,
        appointments,
        totalAppointments,
        completedAppointments,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Toggle doctor verification
router.post("/admin/doctors/toggle-verify/:doctorId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) {
        req.flash('error', 'Doctor not found.');
        return res.redirect('/admin/doctors');
    }
    
    doctor.isVerified = !doctor.isVerified;
    await doctor.save();
    
    req.flash('success', `Doctor ${doctor.firstName} ${doctor.lastName} ${doctor.isVerified ? 'verified' : 'unverified'} successfully.`);
    res.redirect('/admin/doctors');
}));

// Delete doctor
router.post("/admin/doctors/delete/:doctorId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) {
        req.flash('error', 'Doctor not found.');
        return res.redirect('/admin/doctors');
    }
    
    // Delete associated user account
    await User.findByIdAndDelete(doctor.user);
    // Delete doctor profile
    await Doctor.findByIdAndDelete(req.params.doctorId);
    // Delete associated appointments
    await Appointment.deleteMany({ doctor: req.params.doctorId });
    
    req.flash('success', 'Doctor deleted successfully.');
    res.redirect('/admin/doctors');
}));

// ================================
// ADMIN APPOINTMENTS MANAGEMENT
// ================================

// View all appointments
router.get("/admin/appointments", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const { search, status, date, sortBy } = req.query;
    let query = {};
    
    if (search) {
        // Search will be done after population
    }
    
    if (status && status !== 'all') {
        query.status = status;
    }
    
    if (date) {
        const searchDate = new Date(date);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.appointmentDate = {
            $gte: searchDate,
            $lt: nextDay
        };
    }
    
    let sortOptions = { appointmentDate: -1 };
    if (sortBy === 'date-asc') sortOptions = { appointmentDate: 1 };
    if (sortBy === 'status') sortOptions = { status: 1 };
    
    const appointments = await Appointment.find(query)
        .populate('patient', 'firstName lastName phone email')
        .populate('doctor', 'firstName lastName specialization')
        .sort(sortOptions);
    
    // Filter by search after population
    let filteredAppointments = appointments;
    if (search) {
        filteredAppointments = appointments.filter(apt => {
            const patientName = `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.toLowerCase();
            const doctorName = `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.toLowerCase();
            const searchLower = search.toLowerCase();
            return patientName.includes(searchLower) || doctorName.includes(searchLower);
        });
    }
    
    const totalAppointments = await Appointment.countDocuments();
    const scheduledCount = await Appointment.countDocuments({ status: 'scheduled' });
    const confirmedCount = await Appointment.countDocuments({ status: 'confirmed' });
    const completedCount = await Appointment.countDocuments({ status: 'completed' });
    const cancelledCount = await Appointment.countDocuments({ status: 'cancelled' });
    
    res.render("admin/appointments.ejs", {
        user: req.user,
        appointments: filteredAppointments,
        totalAppointments,
        scheduledCount,
        confirmedCount,
        completedCount,
        cancelledCount,
        filters: { search, status, date, sortBy },
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Update appointment status
router.post("/admin/appointments/update-status/:appointmentId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);
    
    if (!appointment) {
        req.flash('error', 'Appointment not found.');
        return res.redirect('/admin/appointments');
    }
    
    appointment.status = status;
    await appointment.save();
    
    req.flash('success', 'Appointment status updated successfully.');
    res.redirect('/admin/appointments');
}));

// Delete appointment
router.post("/admin/appointments/delete/:appointmentId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    await Appointment.findByIdAndDelete(req.params.appointmentId);
    req.flash('success', 'Appointment deleted successfully.');
    res.redirect('/admin/appointments');
}));

// ================================
// ADMIN HEALTH TIPS MANAGEMENT
// ================================

// View all health tips
router.get("/admin/health-tips", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const { search, category, status, sortBy } = req.query;
    let query = {};
    
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
        ];
    }
    
    if (category && category !== 'all') {
        query.category = category;
    }
    
    if (status && status !== 'all') {
        query.status = status;
    }
    
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'title') sortOptions = { title: 1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
    
    const healthTips = await HealthTip.find(query).sort(sortOptions);
    const categories = await HealthTip.distinct('category');
    
    const totalTips = await HealthTip.countDocuments();
    const publishedCount = await HealthTip.countDocuments({ status: 'published' });
    const draftCount = await HealthTip.countDocuments({ status: 'draft' });
    
    res.render("admin/health-tips.ejs", {
        user: req.user,
        healthTips,
        categories,
        totalTips,
        publishedCount,
        draftCount,
        filters: { search, category, status, sortBy },
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Create health tip page
router.get("/admin/health-tips/create", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    res.render("admin/create-health-tip.ejs", {
        user: req.user,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Create health tip
router.post("/admin/health-tips/create", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const { title, content, category, status } = req.body;
    
    const healthTip = new HealthTip({
        title,
        content,
        category,
        status: status || 'draft',
        author: req.user._id
    });
    
    await healthTip.save();
    req.flash('success', 'Health tip created successfully.');
    res.redirect('/admin/health-tips');
}));

// Delete health tip
router.post("/admin/health-tips/delete/:tipId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    await HealthTip.findByIdAndDelete(req.params.tipId);
    req.flash('success', 'Health tip deleted successfully.');
    res.redirect('/admin/health-tips');
}));

// Toggle health tip status
router.post("/admin/health-tips/toggle-status/:tipId", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const tip = await HealthTip.findById(req.params.tipId);
    if (!tip) {
        req.flash('error', 'Health tip not found.');
        return res.redirect('/admin/health-tips');
    }
    
    tip.status = tip.status === 'published' ? 'draft' : 'published';
    await tip.save();
    
    req.flash('success', `Health tip ${tip.status === 'published' ? 'published' : 'unpublished'} successfully.`);
    res.redirect('/admin/health-tips');
}));

// ================================
// ADMIN DEPARTMENTS & SETTINGS
// ================================

// View departments
router.get("/admin/departments", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    // Get department statistics from doctors
    const departments = await Doctor.aggregate([
        { $match: { isVerified: true } },
        { 
            $group: {
                _id: '$specialization',
                doctorCount: { $sum: 1 },
                avgExperience: { $avg: '$experience' }
            }
        },
        { $sort: { doctorCount: -1 } }
    ]);
    
    res.render("admin/departments.ejs", {
        user: req.user,
        departments,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// View reports
router.get("/admin/reports", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    // Generate system statistics
    const totalPatients = await Patient.countDocuments();
    const totalDoctors = await Doctor.countDocuments({ isVerified: true });
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    
    // Monthly statistics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyPatients = await Patient.countDocuments({ createdAt: { $gte: currentMonth } });
    const monthlyAppointments = await Appointment.countDocuments({ createdAt: { $gte: currentMonth } });
    
    res.render("admin/reports.ejs", {
        user: req.user,
        stats: {
            totalPatients,
            totalDoctors,
            totalAppointments,
            completedAppointments,
            monthlyPatients,
            monthlyAppointments
        },
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Settings page
router.get("/admin/settings", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }
    
    const profile = await Admin.findOne({ user: req.user._id });
    
    // Get or create settings for this admin
    let settings = await Settings.findOne({ admin: profile._id });
    if (!settings) {
        settings = await Settings.create({
            admin: profile._id,
            emailNotifications: true,
            appointmentReminders: true,
            databaseBackups: true,
            twoFactorAuth: false
        });
    }
    
    res.render("admin/settings.ejs", {
        user: req.user,
        profile,
        settings,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Update admin profile
router.post("/admin/settings/update-profile", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }

    const { firstName, lastName, phone, department, position } = req.body;

    const profile = await Admin.findOne({ user: req.user._id });
    
    if (!profile) {
        req.flash('error', 'Profile not found.');
        return res.redirect('/admin/settings');
    }

    profile.firstName = firstName;
    profile.lastName = lastName;
    profile.phone = phone;
    profile.department = department;
    profile.position = position;

    await profile.save();

    req.flash('success', 'Profile updated successfully!');
    res.redirect('/admin/settings');
}));

// Change password
router.post("/admin/settings/change-password", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        req.flash('error', 'New passwords do not match.');
        return res.redirect('/admin/settings');
    }

    // Validate password length
    if (newPassword.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long.');
        return res.redirect('/admin/settings');
    }

    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        req.flash('error', 'Current password is incorrect.');
        return res.redirect('/admin/settings');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    req.flash('success', 'Password changed successfully!');
    res.redirect('/admin/settings');
}));

// Update system settings
router.post("/admin/settings/update-system", asyncWrap(async (req, res) => {
    if (!req.user || req.user.portal !== 'admin') {
        req.flash('error', 'Access denied. Admin access required.');
        return res.redirect('/admin/login');
    }

    const profile = await Admin.findOne({ user: req.user._id });
    
    const { emailNotifications, appointmentReminders, databaseBackups, twoFactorAuth } = req.body;

    let settings = await Settings.findOne({ admin: profile._id });
    
    if (!settings) {
        settings = new Settings({ admin: profile._id });
    }

    settings.emailNotifications = emailNotifications === 'on';
    settings.appointmentReminders = appointmentReminders === 'on';
    settings.databaseBackups = databaseBackups === 'on';
    settings.twoFactorAuth = twoFactorAuth === 'on';

    await settings.save();

    req.flash('success', 'System settings updated successfully!');
    res.redirect('/admin/settings');
}));

router.get("/forgot-password", (req, res) => {
    res.send("Forgot Password Page - To be implemented");
});

// ================================
// PATIENT DASHBOARD FEATURES
// ================================

// Search Doctors Feature
router.get("/patient/search-doctors", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { specialty, search, location, availability } = req.query;
    
    let query = { isVerified: true };
    
    // Filter by specialty
    if (specialty && specialty !== 'all') {
        query.specialization = specialty;
    }
    
    // Search by name
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { specialization: { $regex: search, $options: 'i' } }
        ];
    }
    
    const doctors = await Doctor.find(query)
        .populate('user', 'username email')
        .select('firstName lastName specialization experience consultationFee currentHospital ratings profileImage address')
        .sort({ 'ratings.overall': -1, experience: -1 })
        .limit(20);
    
    // Get unique specializations for filter dropdown
    const specializations = await Doctor.distinct('specialization', { isVerified: true });
    
    res.render("patient/search-doctors.ejs", {
        doctors,
        specializations,
        filters: { specialty, search, location, availability },
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Appointments Feature
router.get("/patient/appointments", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    if (!req.patientProfile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/patient/complete-profile');
    }
    
    const { filter } = req.query;
    
    let query = { patient: req.patientProfile._id };
    
    // Filter by status
    if (filter && filter !== 'all') {
        query.status = filter;
    }
    
    const appointments = await Appointment.find(query)
        .populate('doctor', 'firstName lastName specialization currentHospital address')
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .limit(50);
    
    // Get upcoming appointments for calendar view
    const upcomingAppointments = await Appointment.find({
        patient: req.patientProfile._id,
        appointmentDate: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] }
    })
    .populate('doctor', 'firstName lastName specialization currentHospital address')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .limit(10);
    
    res.render("patient/appointments.ejs", {
        appointments,
        upcomingAppointments,
        filter: filter || 'all',
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// View Appointment Details
router.get("/patient/appointments/:id", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    if (!req.patientProfile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/patient/complete-profile');
    }
    
    const appointmentId = req.params.id;
    
    // Find the appointment and populate doctor details
    const appointment = await Appointment.findById(appointmentId)
        .populate('doctor', 'firstName lastName specialization consultationFee currentHospital address phone')
        .populate('patient', 'firstName lastName dateOfBirth gender contactNumber email');
    
    // Check if appointment exists
    if (!appointment) {
        req.flash('error', 'Appointment not found');
        return res.redirect('/patient/appointments');
    }
    
    // Verify this appointment belongs to the logged-in patient
    if (appointment.patient._id.toString() !== req.patientProfile._id.toString()) {
        req.flash('error', 'Unauthorized access');
        return res.redirect('/patient/appointments');
    }
    
    res.render("patient/appointment-details.ejs", {
        appointment,
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// View Doctor Public Profile
router.get("/patient/doctor-profile/:id", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const doctorId = req.params.id;
    
    // Find the doctor with all details
    const doctor = await Doctor.findById(doctorId)
        .populate('user', 'username email');
    
    // Check if doctor exists
    if (!doctor) {
        req.flash('error', 'Doctor not found');
        return res.redirect('/patient/search-doctors');
    }
    
    res.render("patient/doctor-public-profile.ejs", {
        doctor,
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Book Appointment (without specific doctor)
router.get("/patient/book-appointment", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    // Get available doctors
    const availableDoctors = await Doctor.find({ isVerified: true })
        .select('firstName lastName specialization consultationFee')
        .sort({ 'ratings.overall': -1 })
        .limit(10);
    
    res.render("patient/book-appointment.ejs", {
        selectedDoctor: null,
        availableDoctors,
        user: req.user,
        patient: req.patient,
        successMessage: req.flash('success')[0] || null,
        errorMessage: req.flash('error')[0] || null
    });
}));

// Book Appointment (with specific doctor)
router.get("/patient/book-appointment/:doctorId", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { doctorId } = req.params;
    
    let selectedDoctor = null;
    if (doctorId) {
        selectedDoctor = await Doctor.findById(doctorId)
            .populate('user', 'username')
            .select('firstName lastName specialization consultationFee availability currentHospital isVerified');
        
        if (!selectedDoctor || !selectedDoctor.isVerified) {
            req.flash('error', 'Doctor not found or not available');
            return res.redirect('/patient/search-doctors');
        }
    }
    
    // Get available doctors if no specific doctor selected
    const availableDoctors = await Doctor.find({ isVerified: true })
        .select('firstName lastName specialization consultationFee')
        .sort({ 'ratings.overall': -1 })
        .limit(10);
    
    res.render("patient/book-appointment.ejs", {
        selectedDoctor,
        availableDoctors,
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Process Appointment Booking
router.post("/patient/book-appointment", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { doctorId, appointmentDate, appointmentTime, reason, symptoms, type, mode, priority } = req.body;
    
    if (!req.patientProfile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/patient/complete-profile');
    }
    
    // Validate required fields
    if (!doctorId || !appointmentDate || !appointmentTime || !reason) {
        req.flash('error', 'All required fields must be filled');
        return res.redirect('/patient/book-appointment');
    }
    
    // Validate doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isVerified) {
        req.flash('error', 'Selected doctor is not available');
        return res.redirect('/patient/search-doctors');
    }
    
    // Check for appointment conflicts
    const conflictingAppointment = await Appointment.findOne({
        doctor: doctorId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime: appointmentTime,
        status: { $in: ['scheduled', 'confirmed'] }
    });
    
    if (conflictingAppointment) {
        req.flash('error', 'This time slot is already booked. Please choose a different time.');
        return res.redirect(`/patient/book-appointment/${doctorId}`);
    }
    
    // Create appointment
    const appointment = new Appointment({
        patient: req.patientProfile._id,
        doctor: doctorId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        reason,
        symptoms: symptoms ? symptoms.split(',').map(s => s.trim()) : [],
        type: type || 'consultation',
        mode: mode || 'in-person',
        priority: priority || 'medium',
        cost: {
            consultationFee: doctor.consultationFee?.inPerson || 0
        }
    });
    
    await appointment.save();
    
    // Add patient to doctor's patients array if not already there
    if (!doctor.patients.includes(req.patientProfile._id)) {
        doctor.patients.push(req.patientProfile._id);
        await doctor.save();
    }
    
    req.flash('success', `Appointment booked successfully for ${new Date(appointmentDate).toLocaleDateString()} at ${appointmentTime}`);
    res.redirect('/patient/appointments');
}));

// Cancel Appointment
router.post("/patient/appointments/:id/cancel", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    if (!req.patientProfile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/patient/appointments');
    }
    
    const appointmentId = req.params.id;
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
        req.flash('error', 'Appointment not found');
        return res.redirect('/patient/appointments');
    }
    
    // Verify this appointment belongs to the logged-in patient
    if (appointment.patient.toString() !== req.patientProfile._id.toString()) {
        req.flash('error', 'Unauthorized access');
        return res.redirect('/patient/appointments');
    }
    
    // Check if appointment can be cancelled
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        req.flash('error', 'Cannot cancel this appointment');
        return res.redirect('/patient/appointments');
    }
    
    // Update appointment status
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = 'patient';
    
    await appointment.save();
    
    req.flash('success', 'Appointment cancelled successfully');
    res.redirect('/patient/appointments');
}));

// Test Results Feature
router.get("/patient/test-results", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    console.log('=== PATIENT TEST RESULTS ROUTE HIT ===');
    console.log('User:', req.user ? req.user.email : 'Not logged in');
    console.log('Portal:', req.user ? req.user.portal : 'N/A');
    console.log('Patient Profile:', req.patientProfile ? req.patientProfile._id : 'No profile');
    
    if (!req.patientProfile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/patient/complete-profile');
    }
    
    const { testType, status, month, year } = req.query;
    
    let query = { patient: req.patientProfile._id };
    
    // Filter by test type
    if (testType && testType !== 'all') {
        query.testType = testType;
    }
    
    // Filter by status
    if (status && status !== 'all') {
        query.status = status;
    }
    
    // Filter by date
    if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        query.testDate = { $gte: startDate, $lte: endDate };
    }
    
    const testResults = await TestResult.find(query)
        .populate('doctor', 'firstName lastName specialization')
        .sort({ testDate: -1, reportDate: -1 })
        .limit(50);
    
    // Get recent results for dashboard
    const recentResults = await TestResult.find({ patient: req.patientProfile._id })
        .populate('doctor', 'firstName lastName')
        .sort({ reportDate: -1 })
        .limit(5);
    
    // Get test types for filter
    const testTypes = await TestResult.distinct('testType', { patient: req.patientProfile._id });
    
    // Calculate statistics for all test results
    const allTestResults = await TestResult.find({ patient: req.patientProfile._id });
    const stats = {
        total: allTestResults.length,
        pending: allTestResults.filter(t => t.status === 'pending').length,
        completed: allTestResults.filter(t => t.status === 'completed').length,
        abnormal: allTestResults.filter(t => t.status === 'completed' && t.parameters && t.parameters.some(p => p.status !== 'normal')).length
    };
    
    res.render("patient/test-results.ejs", {
        testResults,
        recentResults,
        testTypes,
        stats,
        filters: { 
            testType: testType || 'all',
            status: status || 'all',
            month: month || '',
            year: year || ''
        },
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// View specific test result
router.get("/patient/test-results/:resultId", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { resultId } = req.params;
    
    const testResult = await TestResult.findOne({
        _id: resultId,
        patient: req.patientProfile._id
    }).populate('doctor', 'firstName lastName specialization currentHospital');
    
    if (!testResult) {
        req.flash('error', 'Test result not found');
        return res.redirect('/patient/test-results');
    }
    
    res.render("patient/test-result-detail.ejs", {
        testResult,
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Health Tips Feature
router.get("/patient/health-tips", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { category, search } = req.query;
    
    let query = { status: 'published' };
    
    // Filter by category
    if (category && category !== 'all') {
        query.category = category;
    }
    
    // Search functionality
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }
    
    // Get personalized tips if patient profile exists
    let personalizedTips = [];
    if (req.patientProfile) {
        personalizedTips = await HealthTip.getPersonalizedTips(req.patientProfile, 5);
        
        // Auto-generate tips ONLY if this patient has never had tips generated before
        // Check if patient already has generated tips in the database
        const existingPatientTips = await HealthTip.countDocuments({
            status: 'published',
            'metadata.generatedForPatient': req.patientProfile._id
        });
        
        if (existingPatientTips === 0 && personalizedTips.length < 5) {
            try {
                console.log(`Generating initial health tips for patient ${req.patientProfile._id} (one-time generation)`);
                
                const tipsNeeded = 5;
                const generatedTips = await generatePersonalizedHealthTips(req.patientProfile, tipsNeeded);
                
                // Save generated tips to database with patient reference
                for (const tipData of generatedTips) {
                    const healthTip = new HealthTip({
                        ...tipData,
                        metadata: {
                            ...tipData.metadata,
                            generatedForPatient: req.patientProfile._id,
                            generatedAt: new Date()
                        }
                    });
                    await healthTip.save();
                }
                
                // Refresh personalized tips after generation
                personalizedTips = await HealthTip.getPersonalizedTips(req.patientProfile, 5);
                
                console.log(`Successfully generated ${generatedTips.length} health tips for patient (one-time). Total personalized tips: ${personalizedTips.length}`);
            } catch (error) {
                console.error('Error auto-generating health tips:', error);
                // Continue rendering page even if auto-generation fails
            }
        }
    }
    
    // Get regular tips
    const healthTips = await HealthTip.find(query)
        .sort({ featured: -1, 'engagement.views': -1, createdAt: -1 })
        .limit(20);
    
    // Get featured tips
    const featuredTips = await HealthTip.getFeaturedTips(3);
    
    // Get categories for filter
    const categories = await HealthTip.distinct('category', { status: 'published' });
    
    res.render("patient/health-tips.ejs", {
        healthTips,
        personalizedTips,
        featuredTips,
        categories,
        filters: { category, search },
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Health Tips Generator Page (must come before :tipId route)
router.get("/patient/health-tips/generate-page", requirePatientAuth, attachPatientProfile, (req, res) => {
    res.render("patient/generate-health-tips.ejs", {
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
});

// View specific health tip
router.get("/patient/health-tips/:tipId", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { tipId } = req.params;
    
    const healthTip = await HealthTip.findById(tipId);
    
    if (!healthTip || healthTip.status !== 'published') {
        req.flash('error', 'Health tip not found');
        return res.redirect('/patient/health-tips');
    }
    
    // Increment view count
    await healthTip.incrementView();
    
    // Get related tips
    const relatedTips = await HealthTip.find({
        _id: { $ne: tipId },
        category: healthTip.category,
        status: 'published'
    }).limit(5);
    
    res.render("patient/health-tip-detail.ejs", {
        healthTip,
        relatedTips,
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Like health tip
router.post("/patient/health-tips/:tipId/like", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { tipId } = req.params;
    
    const healthTip = await HealthTip.findById(tipId);
    
    if (!healthTip) {
        return res.status(404).json({ success: false, message: 'Health tip not found' });
    }
    
    await healthTip.toggleLike(req.patientProfile._id);
    
    res.json({ success: true, message: 'Like status updated' });
}));

// Bookmark health tip
router.post("/patient/health-tips/:tipId/bookmark", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { tipId } = req.params;
    
    const healthTip = await HealthTip.findById(tipId);
    
    if (!healthTip) {
        return res.status(404).json({ success: false, message: 'Health tip not found' });
    }
    
    await healthTip.toggleBookmark(req.patientProfile._id);
    
    res.json({ success: true, message: 'Bookmark status updated' });
}));

// Generate personalized health tips using AI
router.post("/patient/health-tips/generate", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    try {
        const { count = 5 } = req.body;
        
        if (!req.patientProfile) {
            return res.status(400).json({ 
                success: false, 
                message: 'Patient profile not found. Please complete your profile first.' 
            });
        }

        // Generate health tips using Groq AI
        const generatedTips = await generatePersonalizedHealthTips(req.patientProfile, parseInt(count));
        
        // Save tips to database
        const savedTips = [];
        for (const tipData of generatedTips) {
            const healthTip = new HealthTip(tipData);
            await healthTip.save();
            savedTips.push(healthTip);
        }

        res.json({ 
            success: true, 
            message: `Successfully generated ${savedTips.length} personalized health tips`,
            tips: savedTips
        });

    } catch (error) {
        console.error('Error generating health tips:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate health tips. Please try again.',
            error: error.message 
        });
    }
}));

// Generate health tip on specific topic
router.post("/patient/health-tips/generate-topic", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    try {
        const { topic } = req.body;
        
        if (!topic) {
            return res.status(400).json({ 
                success: false, 
                message: 'Topic is required' 
            });
        }

        // Generate health tip using Groq AI
        const tipData = await generateHealthTipOnTopic(topic, req.patientProfile);
        
        // Save tip to database
        const healthTip = new HealthTip(tipData);
        await healthTip.save();

        res.json({ 
            success: true, 
            message: 'Successfully generated health tip',
            tip: healthTip
        });

    } catch (error) {
        console.error('Error generating health tip:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate health tip. Please try again.',
            error: error.message 
        });
    }
}));

// Prescriptions Feature
router.get("/patient/prescriptions", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    if (!req.patientProfile) {
        req.flash('error', 'Please complete your profile first');
        return res.redirect('/patient/complete-profile');
    }
    
    const { status, medicationType, refillStatus } = req.query;
    
    let query = { patient: req.patientProfile._id };
    
    if (status && status !== 'all') {
        query.status = status;
    }
    
    const prescriptions = await Prescription.find(query)
        .populate('doctor', 'firstName lastName specialization')
        .sort({ prescriptionDate: -1 })
        .limit(50);
    
    // Get active prescriptions
    const activePrescriptions = await Prescription.getActivePrescriptions(req.patientProfile._id);
    
    // Calculate statistics
    const allPrescriptions = await Prescription.find({ patient: req.patientProfile._id });
    const stats = {
        total: allPrescriptions.length,
        active: allPrescriptions.filter(p => p.status === 'active').length,
        expired: allPrescriptions.filter(p => p.status === 'expired').length,
        refillNeeded: allPrescriptions.filter(p => p.status === 'active' && p.refillsRemaining <= 1).length
    };
    
    // Get unique medication types for filter dropdown
    const medicationTypes = ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'inhaler'];
    
    res.render("patient/prescriptions.ejs", {
        prescriptions,
        activePrescriptions,
        stats,
        medicationTypes,
        filters: { 
            status: status || 'all',
            medicationType: medicationType || 'all',
            refillStatus: refillStatus || 'all'
        },
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// View specific prescription
router.get("/patient/prescriptions/:prescriptionId", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { prescriptionId } = req.params;
    
    const prescription = await Prescription.findOne({
        _id: prescriptionId,
        patient: req.patientProfile._id
    }).populate('doctor', 'firstName lastName specialization currentHospital');
    
    if (!prescription) {
        req.flash('error', 'Prescription not found');
        return res.redirect('/patient/prescriptions');
    }
    
    res.render("patient/prescription-detail.ejs", {
        prescription,
        user: req.user,
        patient: req.patientProfile,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// API Routes for AJAX functionality
router.post("/api/patient/health-tip/like/:tipId", requirePatientAuthAPI, attachPatientProfile, asyncWrap(async (req, res) => {
    const { tipId } = req.params;
    
    const healthTip = await HealthTip.findById(tipId);
    if (!healthTip) {
        return res.json({ success: false, error: 'Health tip not found' });
    }
    
    await healthTip.toggleLike(req.patientProfile._id);
    
    res.json({ 
        success: true, 
        liked: healthTip.isLikedBy(req.patientProfile._id),
        likesCount: healthTip.engagement.likes
    });
}));

router.post("/api/patient/health-tip/bookmark/:tipId", requirePatientAuthAPI, attachPatientProfile, asyncWrap(async (req, res) => {
    const { tipId } = req.params;
    
    const healthTip = await HealthTip.findById(tipId);
    if (!healthTip) {
        return res.json({ success: false, error: 'Health tip not found' });
    }
    
    await healthTip.toggleBookmark(req.patientProfile._id);
    
    res.json({ 
        success: true, 
        bookmarked: healthTip.isBookmarkedBy(req.patientProfile._id),
        bookmarksCount: healthTip.engagement.bookmarks
    });
}));

// Cancel appointment
router.post("/patient/appointments/:appointmentId/cancel", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    
    console.log('Cancel request - User:', req.user?.email);
    console.log('Cancel request - Patient Profile:', req.patientProfile?._id);
    console.log('Cancel request - Appointment ID:', appointmentId);
    
    if (!req.patientProfile) {
        req.flash('error', 'Patient profile not found. Please complete your profile first.');
        return res.redirect('/patient/complete-profile');
    }
    
    const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: req.patientProfile._id
    });
    
    if (!appointment) {
        req.flash('error', 'Appointment not found');
        return res.redirect('/patient/appointments');
    }
    
    if (!appointment.canCancel()) {
        req.flash('error', 'This appointment cannot be cancelled');
        return res.redirect('/patient/appointments');
    }
    
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || 'Patient cancelled';
    
    await appointment.save();
    
    req.flash('success', 'Appointment cancelled successfully');
    res.redirect('/patient/appointments');
}));

// Cancel reschedule - redirect back to appointments
router.get("/patient/appointments/cancel-reschedule", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    res.redirect('/patient/appointments');
}));

// Show reschedule form
router.get("/patient/appointments/:appointmentId/reschedule", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { appointmentId } = req.params;
    
    if (!req.patientProfile) {
        req.flash('error', 'Patient profile not found. Please complete your profile first.');
        return res.redirect('/patient/complete-profile');
    }
    
    const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: req.patientProfile._id
    }).populate('doctor', 'firstName lastName email specialization');
    
    if (!appointment) {
        req.flash('error', 'Appointment not found');
        return res.redirect('/patient/appointments');
    }
    
    if (!appointment.canReschedule()) {
        req.flash('error', 'This appointment cannot be rescheduled');
        return res.redirect('/patient/appointments');
    }
    
    res.render('patient/reschedule-appointment', {
        title: 'Reschedule Appointment',
        appointment,
        errorMessage: req.flash('error')[0] || null,
        successMessage: req.flash('success')[0] || null
    });
}));

// Process reschedule appointment
router.post("/patient/appointments/:appointmentId/reschedule", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { appointmentId } = req.params;
    const { appointmentDate, appointmentTime, rescheduleReason } = req.body;
    
    if (!req.patientProfile) {
        req.flash('error', 'Patient profile not found. Please complete your profile first.');
        return res.redirect('/patient/complete-profile');
    }
    
    const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: req.patientProfile._id
    }).populate('doctor', 'firstName lastName email');
    
    if (!appointment) {
        req.flash('error', 'Appointment not found');
        return res.redirect('/patient/appointments');
    }
    
    if (!appointment.canReschedule()) {
        req.flash('error', 'This appointment cannot be rescheduled');
        return res.redirect('/patient/appointments');
    }
    
    // Validate new date and time
    if (!appointmentDate || !appointmentTime) {
        req.flash('error', 'Please select both date and time');
        return res.redirect(`/patient/appointments/${appointmentId}/reschedule`);
    }
    
    const newAppointmentDate = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newAppointmentDate < today) {
        req.flash('error', 'Cannot schedule appointment for past dates');
        return res.redirect(`/patient/appointments/${appointmentId}/reschedule`);
    }
    
    // Check if the new slot is available
    const existingAppointment = await Appointment.findOne({
        doctor: appointment.doctor._id,
        appointmentDate: newAppointmentDate,
        appointmentTime: appointmentTime,
        status: { $in: ['scheduled', 'confirmed'] },
        _id: { $ne: appointment._id }
    });
    
    if (existingAppointment) {
        req.flash('error', 'The selected time slot is not available. Please choose another time');
        return res.redirect(`/patient/appointments/${appointmentId}/reschedule`);
    }
    
    // Store old appointment details for reference
    const oldDate = appointment.appointmentDate;
    const oldTime = appointment.appointmentTime;
    
    // Update the appointment
    appointment.appointmentDate = newAppointmentDate;
    appointment.appointmentTime = appointmentTime;
    appointment.status = 'scheduled';
    appointment.rescheduleReason = rescheduleReason || null;
    appointment.rescheduledAt = new Date();
    
    await appointment.save();
    
    req.flash('success', `Appointment successfully rescheduled from ${oldDate.toLocaleDateString()} ${oldTime} to ${newAppointmentDate.toLocaleDateString()} ${appointmentTime}`);
    res.redirect('/patient/appointments');
}));

// API: Toggle medication tracking
router.post("/api/patient/medication-tracking/toggle", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    const { medicationName, type, taken } = req.body;
    
    if (!medicationName || !type) {
        return res.status(400).json({ 
            success: false, 
            message: 'Medication name and type are required' 
        });
    }
    
    try {
        // Get or create today's tracking
        let tracking = await MedicationTracking.getTodayTracking(req.patientProfile._id);
        
        // Find or create the medication entry
        const list = type === 'supplement' ? tracking.supplements : tracking.medications;
        let item = list.find(m => (m.medicationName || m.name) === medicationName);
        
        if (!item) {
            // Create new tracking entry
            const newItem = {
                [type === 'supplement' ? 'name' : 'medicationName']: medicationName,
                taken: taken === true,
                takenAt: taken === true ? new Date() : null
            };
            list.push(newItem);
        } else {
            // Update existing entry
            item.taken = taken === true;
            item.takenAt = taken === true ? new Date() : null;
        }
        
        await tracking.save();
        
        res.json({ 
            success: true, 
            message: taken ? 'Medication marked as taken' : 'Medication unmarked',
            tracking: {
                medicationName,
                taken: taken === true,
                takenAt: item ? item.takenAt : (taken === true ? new Date() : null)
            }
        });
    } catch (error) {
        console.error('Error toggling medication tracking:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating medication tracking' 
        });
    }
}));

// API: Get today's medication tracking
router.get("/api/patient/medication-tracking/today", requirePatientAuth, attachPatientProfile, asyncWrap(async (req, res) => {
    try {
        const tracking = await MedicationTracking.getTodayTracking(req.patientProfile._id);
        res.json({ 
            success: true, 
            tracking 
        });
    } catch (error) {
        console.error('Error fetching medication tracking:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching medication tracking' 
        });
    }
}));

module.exports = router;
