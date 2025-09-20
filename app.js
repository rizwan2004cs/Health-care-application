const express = require("express");
const app  = express();
const mongoose = require("mongoose");
const ejs = require("ejs");
const MONGO_URL = "mongodb://127.0.0.1:27017/health_care";
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
                { email: "admin@healthcare.com" }, 
                { username: "admin" }
            ]
        });
        
        if (existingAdmin) {
            console.log("Default admin user already exists");
            return;
        }
        
        // Create admin user
        const adminUser = new User({
            email: "admin@healthcare.com",
            username: "admin",
            portal: "admin"
        });
        
        const registeredAdmin = await User.register(adminUser, "admin123");
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
        console.log("   Email: admin@healthcare.com");
        console.log("   Username: admin");
        console.log("   Password: admin123");
        console.log("   Portal: http://localhost:8080/admin/login");
        
    } catch (error) {
        console.error("❌ Error creating default admin:", error.message);
    }
}

// Express session and passport configuration - MUST come before routes
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
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

app.listen(8080,() =>{
    console.log("Server is listening on port 8080")
});