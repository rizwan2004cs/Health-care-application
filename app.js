require('dotenv').config();

const express = require("express");
const app  = express();
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/health_care";
const passport = require("passport");
const passportLocal = require("passport-local");
const User = require("./models/users.js")
const Patient = require("./models/patients.js");
const Doctor = require("./models/doctors.js");
const Admin = require("./models/admin.js");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");

const userRouter = require("./routes/user.js");

// Body parsing middleware - MUST come before routes
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

main().then(() => {
    console.log("Connected to database");
    // Create default admin user if it doesn't exist
    createDefaultAdmin();
}).catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

// Function to create default admin user
async function createDefaultAdmin() {
    try {
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ 
            $or: [
                { email: process.env.ADMIN_EMAIL || "admin@healthcare.com" }, 
                { username: process.env.ADMIN_USERNAME || "admin" }
            ]
        });
        
        if (existingAdmin) {
            console.log("Default admin user already exists");
            return;
        }
        
        // Create admin user
        const adminUser = new User({
            email: process.env.ADMIN_EMAIL || "admin@healthcare.com",
            username: process.env.ADMIN_USERNAME || "admin",
            portal: "admin"
        });
        
        const registeredAdmin = await User.register(adminUser, process.env.ADMIN_PASSWORD || "admin123");
        console.log("✅ Default admin user created successfully");
        
        // Create admin profile
        const adminProfile = new Admin({
            user: registeredAdmin._id,
            firstName: "System",
            lastName: "Administrator",
            phone: "9999999999",
            adminId: "ADM000001",
            employeeId: "EMP000001",
            department: "IT",
            position: "Super Admin",
            accessLevel: "super-admin",
            employment: {
                joinDate: new Date(),
                employmentType: "full-time"
            },
            // Grant all permissions to super admin
            permissions: {
                users: { create: true, read: true, update: true, delete: true },
                doctors: { create: true, read: true, update: true, delete: true, verify: true },
                patients: { create: true, read: true, update: true, delete: true },
                appointments: { create: true, read: true, update: true, delete: true, cancel: true },
                reports: { view: true, generate: true, export: true },
                system: { settings: true, backup: true, maintenance: true, audit: true }
            }
        });
        
        await adminProfile.save();
        console.log("✅ Default admin profile created successfully");
        console.log("🔑 Admin Login Details:");
        console.log("   Email:", process.env.ADMIN_EMAIL || "admin@healthcare.com");
        console.log("   Username:", process.env.ADMIN_USERNAME || "admin");
        console.log("   Password: [Configured in .env file]");
        console.log("   Portal: http://localhost:" + (process.env.PORT || 8080) + "/admin/login");
        
    } catch (error) {
        console.error("❌ Error creating default admin:", error.message);
    }
}

// MongoDB Session Store Configuration
const SESSION_LIFETIME_DAYS = parseInt(process.env.SESSION_LIFETIME_DAYS) || 3;
const SESSION_LIFETIME_MS = SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000; // Convert to milliseconds
const SESSION_LIFETIME_SEC = SESSION_LIFETIME_DAYS * 24 * 60 * 60; // Convert to seconds

const sessionStore = MongoStore.create({
    mongoUrl: MONGO_URL,
    touchAfter: 24 * 3600, // Lazy session update - only update session once per 24 hours
    crypto: {
        secret: process.env.SESSION_SECRET || 'keyboard cat'
    },
    collectionName: 'sessions',
    ttl: SESSION_LIFETIME_SEC // Session expires after configured days (in seconds)
});

sessionStore.on('error', (err) => {
    console.error('❌ Session store error:', err);
});

console.log(`✅ Session store configured with ${SESSION_LIFETIME_DAYS} day(s) lifetime`);

// Express session and passport configuration - MUST come before routes
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'keyboard cat', 
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    store: sessionStore,
    cookie: {
        maxAge: SESSION_LIFETIME_MS, // Cookie expires after configured days (in milliseconds)
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        secure: process.env.NODE_ENV === 'production' // Use secure cookies in production (HTTPS)
    }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport to use User model for authentication
passport.use(new LocalStrategy({
    usernameField: 'login', // We'll use 'login' field that can contain either username or email
    passwordField: 'password'
}, async (login, password, done) => {
    try {
        // Try to find user by username first, then by email
        let user = await User.findOne({ username: login });
        if (!user) {
            user = await User.findOne({ email: login });
        }
        
        if (!user) {
            return done(null, false, { message: 'User not found' });
        }
        
        // Use passport-local-mongoose's authenticate method
        user.authenticate(password, (err, authUser, info) => {
            if (err) {
                return done(err);
            }
            
            if (!authUser) {
                return done(null, false, { message: 'Incorrect password' });
            }
            
            return done(null, authUser);
        });
        
    } catch (error) {
        return done(error);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            return done(null, false);
        }
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Add logging middleware to debug routing issues  
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

app.use("/",userRouter);

app.get("/",(req,res) => {
    res.render("portal-selection.ejs", {
        successMessage: req.flash('success')[0] || null,
        errorMessage: req.flash('error')[0] || null
    });
})

// Dashboard route (after login)
app.get("/dashboard",(req,res) => {
    res.render("dashboards/home.ejs", {
        successMessage: req.flash('success')[0] || null,
        errorMessage: req.flash('error')[0] || null
    });
})

app.get("/demouser",async(req,res) => {
    try {
        let fakeUser  = new User({
            email:"demo@gmail.com",
            username: "demouser",
            portal: "patient"
        });
        let registeredUser = await User.register(fakeUser,"12345678");
        res.json({ 
            success: true, 
            user: registeredUser,
            message: "Demo user created - Login with 'demo@gmail.com' or 'demouser' and password '12345678'"
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get("/test-doctor",async(req,res) => {
    try {
        // Create test user
        let testUser = new User({
            email:"testdoctor@gmail.com",
            username: "testdoctor",
            portal: "doctor"
        });
        let registeredUser = await User.register(testUser,"testpass");
        
        // Create doctor profile
        let doctorProfile = new Doctor({
            user: registeredUser._id,
            firstName: "Test",
            lastName: "Doctor",
            phone: "9876543210",
            dateOfBirth: new Date("1990-01-01"),
            gender: "male"
        });
        
        await doctorProfile.save();
        
        res.json({ 
            success: true, 
            user: registeredUser,
            doctor: doctorProfile,
            message: "Test doctor created successfully!"
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

app.get("/test-patient",async(req,res) => {
    try {
        // Create test user
        let testUser = new User({
            email:"testpatient@gmail.com",
            username: "testpatient",
            portal: "patient"
        });
        let registeredUser = await User.register(testUser,"testpass");
        
        // Create patient profile
        let patientProfile = new Patient({
            user: registeredUser._id,
            firstName: "Test",
            lastName: "Patient",
            phone: "9876543210",
            dateOfBirth: new Date("1995-01-01"),
            gender: "female"
        });
        
        await patientProfile.save();
        
        res.json({ 
            success: true, 
            user: registeredUser,
            patient: patientProfile,
            message: "Test patient created successfully!"
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

// Test endpoint to debug form data structure
app.post("/test-form-data", (req, res) => {
    console.log('=== FORM DATA DEBUG ===');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    res.json({
        message: 'Form data logged to console',
        data: req.body
    });
});

// Test endpoint for patient profile completion (for debugging)
app.post("/test-patient-update", async (req, res) => {
    try {
        console.log('=== PATIENT UPDATE TEST ===');
        console.log('Raw form data:', JSON.stringify(req.body, null, 2));
        
        // Find a test patient (create one if needed)
        let testUser = await User.findOne({ email: "testpatient@gmail.com" });
        if (!testUser) {
            testUser = new User({
                email: "testpatient@gmail.com",
                username: "testpatient",
                portal: "patient"
            });
            testUser = await User.register(testUser, "testpass");
            
            // Create patient profile
            const patientProfile = new Patient({
                user: testUser._id,
                firstName: "Test",
                lastName: "Patient",
                phone: "9876543210",
                dateOfBirth: new Date("1995-01-01"),
                gender: "female"
            });
            await patientProfile.save();
        }
        
        const patient = await Patient.findOne({ user: testUser._id });
        console.log('Patient before update:', JSON.stringify(patient, null, 2));
        
        // Structure the update data the same way as the real route
        const updateData = {};
        
        // Handle emergency contact data
        if (req.body.emergencyContact) {
            if (req.body.emergencyContact.name) {
                updateData['healthProfile.emergencyContact.name'] = req.body.emergencyContact.name;
            }
            if (req.body.emergencyContact.relationship) {
                updateData['healthProfile.emergencyContact.relationship'] = req.body.emergencyContact.relationship;
            }
            if (req.body.emergencyContact.phone) {
                const phone = req.body.emergencyContact.phone.replace(/\D/g, '');
                updateData['healthProfile.emergencyContact.phone'] = phone;
            }
        }
        
        // Handle health profile data
        if (req.body.healthProfile) {
            if (req.body.healthProfile.bloodType) {
                updateData['healthProfile.bloodType'] = req.body.healthProfile.bloodType;
            }
            
            if (req.body.healthProfile.height && req.body.healthProfile.height.value) {
                updateData['healthProfile.height.value'] = Number(req.body.healthProfile.height.value);
                updateData['healthProfile.height.unit'] = 'cm';
            }
            
            if (req.body.healthProfile.weight && req.body.healthProfile.weight.value) {
                updateData['healthProfile.weight.value'] = Number(req.body.healthProfile.weight.value);
                updateData['healthProfile.weight.unit'] = 'kg';
            }
            
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
        
        console.log('Update data structure:', JSON.stringify(updateData, null, 2));
        
        // Perform the update
        const updatedPatient = await Patient.findOneAndUpdate(
            { user: testUser._id }, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );
        
        console.log('Patient after update:', JSON.stringify(updatedPatient, null, 2));
        
        res.json({
            success: true,
            message: 'Test update completed',
            formData: req.body,
            updateData: updateData,
            patientBefore: patient,
            patientAfter: updatedPatient
        });
        
    } catch (error) {
        console.error('Test update error:', error);
        res.json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Serve test form
app.get("/test-form", (req, res) => {
    res.sendFile(__dirname + '/test-form.html');
});

// Check session status
app.get("/check-session", (req, res) => {
    res.sendFile(__dirname + '/check-session.html');
});

// API endpoint to check session
app.get("/api/check-session", (req, res) => {
    if (req.user) {
        res.json({
            loggedIn: true,
            portal: req.user.portal,
            email: req.user.email,
            username: req.user.username,
            userId: req.user._id
        });
    } else {
        res.json({
            loggedIn: false
        });
    }
});

// Test appointment page (bypasses authentication for testing)
app.get("/test-simple", (req, res) => {
    console.log("=== SIMPLE TEST ROUTE HIT ===");
    res.send("Simple test works!");
});

app.get("/test-appointment-page", async (req, res) => {
    console.log("=== TEST APPOINTMENT PAGE ROUTE HIT - NEW VERSION ===");
    try {
        const User = require('./models/users.js');
        const Doctor = require('./models/doctors.js');
        const Appointment = require('./models/appointments.js');
        
        console.log('=== TEST APPOINTMENT PAGE ACCESSED ===');
        
        // Find the doctor
        const doctor = await Doctor.findOne({ firstName: 'umesh' });
        if (!doctor) {
            console.log('❌ Doctor not found');
            return res.send('Doctor not found. Please create a doctor first.');
        }
        
        console.log('✅ Doctor found:', doctor.firstName, doctor.lastName);
        
        // Find user for this doctor
        const user = await User.findById(doctor.user);
        if (!user) {
            console.log('❌ User not found');
            return res.send('User not found for this doctor.');
        }
        console.log('✅ User found:', user.email);
        
        // Get the appointment
        const appointmentId = '68ee8a4e3bc7dffddb623f36';
        const appointment = await Appointment.findById(appointmentId)
            .populate('patient')
            .populate('doctor');
        
        if (!appointment) {
            console.log('❌ Appointment not found');
            return res.send('Appointment not found');
        }
        
        console.log('✅ Appointment found:', appointment.patient.firstName, 'with Dr.', appointment.doctor.firstName);
        console.log('✅ About to render view...');
        
        // Render the appointment details page
        res.render("doctor/appointment-details.ejs", {
            user: user,
            profile: doctor,
            appointment: appointment,
            errorMessage: null,
            successMessage: null
        });
        
        console.log('✅ View rendered successfully');
    } catch (error) {
        console.error('❌ Test page error:', error.message);
        console.error('Stack:', error.stack);
        res.send('Error: ' + error.message + '<br><br><pre>' + error.stack + '</pre>');
    }
});

// 404 Error Handler - Must be after all other routes
app.use((req, res, next) => {
    // Check if user is trying to access protected route without auth
    if (!req.user) {
        const urlParts = req.url.split('/');
        const portal = urlParts[1]; // Extract portal from URL
        
        // Redirect to appropriate login page for protected portals
        if (portal === 'doctor' || portal === 'patient' || portal === 'admin') {
            console.log(`[AUTH] Unauthenticated access attempt to ${req.url} - redirecting to ${portal} login`);
            req.flash('error', 'Please log in to access this page');
            return res.redirect(`/${portal}/login`);
        }
    }
    
    // True 404 - page not found
    console.log(`[404] Page not found: ${req.url}`);
    res.status(404).render('error-404.ejs');
});

// General Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    const statusCode = err.status || 500;
    
    // For 404 errors, render custom 404 page
    if (statusCode === 404) {
        return res.status(404).render('error-404.ejs');
    }
    
    // For authentication errors, redirect to login
    if (statusCode === 401 || statusCode === 403) {
        console.log(`[AUTH ERROR] ${statusCode} - Redirecting to login`);
        req.flash('error', 'Authentication required');
        return res.redirect('/');
    }
    
    // For other errors, render 404 page as fallback (or create a 500 error page)
    res.status(statusCode).render('error-404.ejs');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});