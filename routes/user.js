const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/users.js");
const Patient = require("../models/patients.js");
const Doctor = require("../models/doctors.js");
const Admin = require("../models/admin.js");
const asyncWrap = require("../utils/asyncWrap.js");
const passport = require("passport");

// Portal Selection Route
router.get("/portal-selection", (req, res) => {
    res.render("portal-selection.ejs");
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
        await profile.save();
        
        console.log(`${portal} user created:`, registeredUser);
        console.log(`${portal} profile created:`, profile);
        
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
        console.error("Signup error:", error);
        
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
router.get("/patient/complete-profile", asyncWrap(async (req, res) => {
    if (!req.user) {
        req.flash('error', 'Please log in to access your profile');
        return res.redirect('/patient/login');
    }
    
    // Get existing patient profile if any
    const patient = await Patient.findOne({ user: req.user._id });
    
    res.render("profiles/patient-profile.ejs", {
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
router.post("/patient/complete-profile", asyncWrap(async (req, res) => {
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
router.get("/dashboard", asyncWrap(async (req, res) => {
    if (!req.user) {
        req.flash('error', 'Please log in to access the dashboard');
        return res.redirect('/');
    }
    
    // Get user's portal-specific profile
    let profile = null;
    let profileType = req.user.portal;
    
    switch (profileType) {
        case 'patient':
            profile = await Patient.findOne({ user: req.user._id });
            return res.render("dashboards/patient-dashboard.ejs", {
                user: req.user,
                profile: profile,
                errorMessage: req.flash('error')[0] || null,
                successMessage: req.flash('success')[0] || null
            });
        case 'doctor':
            profile = await Doctor.findOne({ user: req.user._id });
            return res.render("dashboards/doctor-dashboard.ejs", {
                user: req.user,
                profile: profile,
                errorMessage: req.flash('error')[0] || null,
                successMessage: req.flash('success')[0] || null
            });
        case 'admin':
            profile = await Admin.findOne({ user: req.user._id });
            // Get pending doctors for admin verification
            const pendingDoctors = await Doctor.find({ isVerified: false })
                .populate('user', 'username email')
                .sort({ registrationDate: -1 });
            
            return res.render("dashboards/admin-dashboard.ejs", {
                user: req.user,
                profile: profile,
                pendingDoctors: pendingDoctors,
                errorMessage: req.flash('error')[0] || null,
                successMessage: req.flash('success')[0] || null
            });
        default:
            // Fallback to general home dashboard
            res.render("dashboards/home.ejs", {
                user: req.user,
                profile: profile,
                profileType: profileType,
                errorMessage: req.flash('error')[0] || null,
                successMessage: req.flash('success')[0] || null
            });
    }
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
            return res.redirect('/dashboard');
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
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Doctor verification error:', error);
        req.flash('error', 'Error processing verification. Please try again.');
        res.redirect('/dashboard');
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

router.get("/forgot-password", (req, res) => {
    res.send("Forgot Password Page - To be implemented");
});

module.exports = router;
