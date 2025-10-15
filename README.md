# 🏥 Bizil Healthcare Management System# Bizil Health Care



A comprehensive, full-stack healthcare management platform built with modern web technologies. This application provides complete healthcare management solutions for patients, doctors, and administrators with advanced features and secure data handling.A comprehensive healthcare management system built with Node.js, Express, MongoDB, and EJS. This application provides separate portals for patients, doctors, and administrators with role-based access control and verification systems.



**Created by Team Innovators****Created by Team Innovators**



---## Features



## 🌟 Overview- **Multi-Portal System**: Separate interfaces for Patients, Doctors, and Administrators

- **User Authentication**: Secure login/signup with session management

Bizil Healthcare is a complete healthcare ecosystem that digitizes and streamlines medical operations, patient care, and administrative tasks. The system features three dedicated portals with role-based access control, ensuring secure and efficient healthcare delivery.- **Doctor Verification**: Admin approval system for doctor registrations

- **Profile Management**: Comprehensive profile completion for all user types

---- **Modern UI**: Glass-morphism design with responsive layouts

- **Form Validation**: Client-side and server-side validation

## ✨ Key Features

## Prerequisites

### 🔐 Multi-Portal Architecture

- **Patient Portal** - Personal health management and appointment bookingBefore running this application, make sure you have the following installed:

- **Doctor Portal** - Patient management, prescriptions, and schedules

- **Admin Portal** - System administration and user management- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)

- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)

### 🎯 Core Capabilities- **Git** - [Download here](https://git-scm.com/downloads)



#### For Patients 👥## Installation & Setup

- **Profile Management**

  - Complete health profile with medical history### 1. Clone the Repository

  - Emergency contact information

  - Blood type, allergies, and medication tracking```bash

  - Lifestyle and family health historygit clone https://github.com/rizwan2004cs/Health-care.git

  cd Health-care

- **Appointment System**```

  - Book appointments with verified doctors

  - View upcoming and past appointments### 2. Install Dependencies

  - Multiple appointment types (consultation, follow-up, emergency)

  - Online and in-person appointment modes```bash

  - Real-time appointment status trackingnpm install

```

- **Medical Records**

  - Access prescriptions and medications### 3. Start MongoDB

  - View test results and lab reports

  - Download medical documentsMake sure MongoDB is running on your system:

  - Track medication adherence

**Windows:**

- **AI Health Tips**```bash

  - Personalized health recommendations# Start MongoDB service

  - AI-powered health insights using Groq LLaMA 3.3net start MongoDB

  - Category-based health tips```

  - Evidence-based medical advice

**macOS:**

#### For Doctors 👨‍⚕️```bash

- **Patient Management**# Using Homebrew

  - View and manage patient listbrew services start mongodb-community

  - Access complete patient health profiles```

  - Medical history and vital signs

  - Appointment history tracking**Linux:**

```bash

- **Appointment Management**# Using systemctl

  - View daily/weekly schedulessudo systemctl start mongod

  - Manage appointment slots```

  - Confirm, reschedule, or cancel appointments

  - Set availability and working hours### 4. Environment Setup

  - Leave management system

The application uses default configurations. Make sure MongoDB is running on the default port `27017`.

- **Prescription System**

  - Create digital prescriptions### 5. Run the Application

  - Multiple medication support with dosage instructions

  - Diagnosis with ICD codesStart the server:

  - Lab test recommendations

  - Follow-up scheduling```bash

  - Printable prescription formatnpm start

```

- **Test Results**

  - Upload and manage lab reportsOr for development with auto-restart:

  - Review test parameters

  - Add doctor comments and recommendations```bash

  - Flag abnormal resultsnpm run dev

  - Share with patients securely```



- **Professional Profile**The application will be available at: **http://localhost:8080**

  - Specialization and qualifications

  - Experience and certifications## Default Admin Account

  - Consultation fees (in-person, online, follow-up)

  - Multiple language supportThe application automatically creates a default admin account on first run:

  - Ratings and reviews

### Admin Portal

#### For Administrators 🛠️- **Email**: `admin@healthcare.com`

- **User Management**- **Username**: `admin`

  - Doctor verification system- **Password**: Check `.env` file (ADMIN_PASSWORD)

  - Patient account management- **Access**: http://localhost:8080/admin/login

  - Admin user creation

  - Role-based access control## Portal Access



- **Doctor Verification**### Patient Portal

  - Review doctor credentials- **URL**: http://localhost:8080/patient/login

  - Verify medical licenses- **Features**: Health profile management, appointment booking, medical records

  - Approve/reject registrations

  - Document verification### Doctor Portal

- **URL**: http://localhost:8080/doctor/login

- **System Monitoring**- **Features**: Patient management, schedule management, prescriptions

  - Appointment oversight- **Note**: Doctor accounts require admin verification before login

  - User statistics and analytics

  - System health monitoring### Admin Portal

  - Report generation- **URL**: http://localhost:8080/admin/login

- **Features**: User management, doctor verification, system administration

- **Settings Management**

  - System configuration## Application Structure

  - Feature toggles

  - Security settings```

  - Password managementHealth-care/

├── models/          # Database schemas

---├── routes/          # Express routes

├── views/           # EJS templates

## 🚀 Technology Stack├── public/          # Static files (CSS, JS, images)

├── utils/           # Utility functions

### Backend├── app.js           # Main application file

- **Node.js** - Runtime environment└── package.json     # Dependencies and scripts

- **Express.js v5** - Web framework```

- **MongoDB** - NoSQL database

- **Mongoose** - ODM for MongoDB## Usage



### Frontend1. **Start the application** using the steps above

- **EJS** - Template engine2. **Visit** http://localhost:8080 to see the portal selection page

- **HTML5/CSS3** - Modern web standards3. **Sign up** as a patient or doctor, or **login** as admin

- **JavaScript** - Client-side scripting4. **Complete your profile** after registration

- **Glass-morphism Design** - Modern UI/UX5. **For doctors**: Wait for admin verification before accessing the dashboard



### Authentication & Security## Development

- **Passport.js** - Authentication middleware

- **Passport-Local-Mongoose** - User authentication### Available Scripts

- **Express-Session** - Session management

- **Connect-Mongo** - MongoDB session store```bash

- **Bcrypt** - Password hashing# Start the application

npm start

### AI Integration

- **Groq SDK** - AI-powered health tips# Start with nodemon for development

- **LLaMA 3.3 70B** - Large language modelnpm run dev



### Additional Tools# (Add other scripts as needed)

- **dotenv** - Environment configuration```

- **Connect-Flash** - Flash messages

- **Nodemon** - Development auto-restart### Database



---The application uses MongoDB with the following collections:

- `users` - Authentication and portal information

## 📋 Prerequisites- `patients` - Patient profiles and health data

- `doctors` - Doctor profiles and verification status

Before installation, ensure you have:- `admins` - Administrator profiles and permissions



- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)## Troubleshooting

- **MongoDB** (v4.4 or higher) or MongoDB Atlas account

- **npm** (v9.0.0 or higher)### Common Issues

- **Git** - [Download](https://git-scm.com/)

1. **MongoDB Connection Error**

---   - Ensure MongoDB is running

   - Check if port 27017 is available

## 🛠️ Installation & Setup

2. **Port 8080 Already in Use**

### 1. Clone the Repository   - Change the port in `app.js` or stop the process using port 8080



```bash3. **Dependencies Issues**

git clone https://github.com/rizwan2004cs/Health-care.git   - Delete `node_modules` and run `npm install` again

cd "Bizil Health care"

```4. **Database Issues**

   - Restart MongoDB service

### 2. Install Dependencies   - Check MongoDB logs for errors



```bash## Contributing

npm install

```1. Fork the repository

2. Create a feature branch

### 3. Environment Configuration3. Make your changes

4. Submit a pull request

Create a `.env` file in the root directory with the following variables:

## License

```env

# Database ConfigurationThis project is licensed under the MIT License.

MONGO_URL=your_mongodb_connection_string

## Support

# Server Configuration

PORT=8080For support or questions, please create an issue in the GitHub repository.

# Session Configuration
SESSION_SECRET=your-secret-key-here
SESSION_LIFETIME_DAYS=3

# Admin Default Credentials
ADMIN_EMAIL=admin@healthcare.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Application Environment
NODE_ENV=development

# Groq API Configuration (for AI Health Tips)
GROQ_API_KEY=your-groq-api-key-here
```

### 4. Database Setup

#### Option A: Local MongoDB
```bash
# Start MongoDB service
# Windows:
net start MongoDB

# macOS (Homebrew):
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Add to `.env` file as `MONGO_URL`

### 5. Start the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The application will be available at: **http://localhost:8080**

---

## 🎓 Sample Data

The database includes sample data for testing:

### Doctors (Password: `password123`)
- dr.rajesh@healthcare.com - Cardiology
- dr.priya@healthcare.com - Pediatrics
- dr.umesh@healthcare.com - General Medicine
- dr.anjali@healthcare.com - Gynecology
- dr.vikram@healthcare.com - Orthopedics

### Patients (Password: `password123`)
- amit.singh@email.com
- sneha.reddy@email.com
- rahul.verma@email.com
- neha.kapoor@email.com
- arjun.mehta@email.com

### Admin
- Email: `admin@healthcare.com`
- Password: Check `.env` file

---

## 📁 Project Structure

```
Bizil Health care/
├── app.js                    # Main application entry point
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (create this)
├── .gitignore               # Git ignore rules
│
├── models/                   # Mongoose schemas
│   ├── users.js             # User authentication model
│   ├── doctors.js           # Doctor profiles
│   ├── patients.js          # Patient profiles
│   ├── admin.js             # Admin profiles
│   ├── appointments.js      # Appointment scheduling
│   ├── prescriptions.js     # Medical prescriptions
│   ├── testResults.js       # Lab test results
│   ├── healthTips.js        # Health tips content
│   └── settings.js          # System settings
│
├── routes/                   # Express route handlers
│   └── user.js              # All portal routes
│
├── views/                    # EJS templates
│   ├── layouts/             # Shared layouts
│   │   └── boilerplate.ejs  # Main layout template
│   │
│   ├── users/               # Authentication pages
│   │   ├── login.ejs
│   │   └── signup.ejs
│   │
│   ├── dashboards/          # Portal dashboards
│   │   ├── patient-dashboard.ejs
│   │   ├── doctor-dashboard.ejs
│   │   └── admin-dashboard.ejs
│   │
│   ├── patient/             # Patient portal views
│   │   ├── appointments.ejs
│   │   ├── book-appointment.ejs
│   │   ├── health-tips.ejs
│   │   └── prescriptions.ejs
│   │
│   ├── doctor/              # Doctor portal views
│   │   ├── appointments.ejs
│   │   ├── patients.ejs
│   │   ├── prescriptions.ejs
│   │   └── schedule.ejs
│   │
│   └── admin/               # Admin portal views
│       ├── doctors.ejs
│       ├── patients.ejs
│       ├── appointments.ejs
│       └── settings.ejs
│
├── public/                   # Static assets
│   ├── css/                 # Stylesheets
│   │   ├── styles.css
│   │   └── modern-dashboard.css
│   └── images/              # Image assets
│
└── utils/                    # Utility functions
    ├── authMiddleware.js    # Authentication middleware
    ├── asyncWrap.js         # Async error handling
    └── groqHealthTips.js    # AI health tips generator
```

---

## 🌐 Portal Access

### Patient Portal
```
URL: http://localhost:8080/patient/login
Features: Appointments, Health Records, AI Health Tips
```

### Doctor Portal
```
URL: http://localhost:8080/doctor/login
Features: Patient Management, Prescriptions, Schedules
Note: Requires admin verification
```

### Admin Portal
```
URL: http://localhost:8080/admin/login
Features: User Management, System Settings, Reports
```

---

## 🔑 Authentication Flow

1. **User Registration**
   - Select portal type (Patient/Doctor)
   - Create account with email/username
   - Set secure password
   - Email verification (optional)

2. **Profile Completion**
   - Fill mandatory profile fields
   - Add health/professional information
   - Upload verification documents (doctors)

3. **Doctor Verification** (Admin)
   - Review credentials
   - Verify documents
   - Approve or reject

4. **Login & Session**
   - Secure authentication
   - 3-day session persistence
   - Automatic session cleanup

---

## 🎨 Features in Detail

### AI-Powered Health Tips
- Personalized recommendations based on patient profile
- Categories: Nutrition, Exercise, Mental Health, Preventive Care
- Generated using Groq's LLaMA 3.3 70B model
- Evidence-based medical content
- Difficulty levels and reading time estimates

### Appointment System
- **Booking**: Select doctor, date, time, and appointment type
- **Statuses**: Scheduled, Confirmed, Completed, Cancelled
- **Types**: Consultation, Follow-up, Emergency, Routine Checkup
- **Modes**: In-person, Online, Phone
- **Notifications**: Appointment reminders
- **Cancellation**: Cancel up to 2 hours before

### Prescription Management
- Digital prescription creation
- Multiple medications with detailed dosage
- ICD-10 diagnosis codes
- Lab test recommendations
- Dietary and lifestyle advice
- Printable format
- Validity period tracking

### Test Results
- Various test types (Blood, X-Ray, MRI, CT Scan, etc.)
- Parameter tracking with normal ranges
- Abnormal flag detection
- Doctor review and comments
- Document upload support
- Sharing with other doctors

---

## 🔒 Security Features

- **Password Hashing**: Bcrypt encryption
- **Session Security**: HTTP-only cookies, secure in production
- **CSRF Protection**: Built-in Express protection
- **Input Validation**: Client and server-side
- **Role-based Access**: Separate portals with authorization
- **Credential Management**: Environment variables
- **Session Store**: MongoDB with TTL indexes

---

## 📊 Database Schema

### Collections
- **users**: Authentication and portal assignment
- **patients**: Patient health profiles
- **doctors**: Doctor professional profiles
- **admins**: Administrator accounts
- **appointments**: Appointment scheduling
- **prescriptions**: Medical prescriptions
- **testresults**: Lab test reports
- **healthtips**: Health recommendation content
- **sessions**: User session data

---

## 🚦 API Endpoints

### Authentication
```
POST /patient/signup       - Patient registration
POST /doctor/signup        - Doctor registration
POST /patient/login        - Patient login
POST /doctor/login         - Doctor login
POST /admin/login          - Admin login
GET  /logout               - Logout all users
```

### Patient Routes
```
GET  /patient/dashboard
GET  /patient/appointments
POST /patient/appointments/book
GET  /patient/health-tips
GET  /patient/prescriptions
```

### Doctor Routes
```
GET  /doctor/dashboard
GET  /doctor/appointments
GET  /doctor/patients
POST /doctor/prescriptions/create
GET  /doctor/schedule
```

### Admin Routes
```
GET  /admin/dashboard
GET  /admin/doctors
POST /admin/doctors/:id/verify
GET  /admin/patients
GET  /admin/settings
```

---

## 🧪 Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests (if configured)
npm test
```

### Adding New Features

1. Create model in `models/`
2. Add routes in `routes/`
3. Create views in `views/`
4. Update navigation
5. Test thoroughly

---

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
```
Solution: Check MONGO_URL in .env, ensure MongoDB is running
```

**Port Already in Use**
```
Solution: Change PORT in .env or stop process using port 8080
```

**Session Issues**
```
Solution: Clear browser cookies, restart server
```

**Environment Variables Not Loading**
```
Solution: Verify .env file exists in root directory
```

**Admin Login Issues**
```
Solution: Check ADMIN_PASSWORD in .env file
```

---

## 📈 Performance Optimization

- MongoDB indexes on frequently queried fields
- Session store with lazy updates (24-hour throttle)
- Efficient query patterns with population
- Async/await error handling
- Connection pooling

---

## 🔄 Deployment

### Heroku
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set MONGO_URL=your_mongodb_url
heroku config:set SESSION_SECRET=your_secret

# Deploy
git push heroku main
```

### Other Platforms
- **Vercel**: Configure as Node.js project
- **Railway**: Connect GitHub repo, set env vars
- **Render**: Deploy from Git, configure environment
- **AWS/Azure/GCP**: Use containers or serverless

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👥 Team

**Team Innovators**

- Project Lead: Rizwan
- Repository: [github.com/rizwan2004cs/Health-care](https://github.com/rizwan2004cs/Health-care)

---

## 📞 Support

For issues, questions, or contributions:

- **GitHub Issues**: [Create an issue](https://github.com/rizwan2004cs/Health-care/issues)
- **Email**: Contact repository owner
- **Documentation**: This README file

---

## 🙏 Acknowledgments

- MongoDB for database solutions
- Groq for AI integration
- Node.js and Express.js communities
- All open-source contributors

---

## 📝 Version History

- **v1.0.0** - Initial release with core features
  - Multi-portal system
  - Appointment management
  - Prescription system
  - AI health tips
  - Admin verification

---

## 🎯 Future Enhancements

- [ ] Real-time chat between doctors and patients
- [ ] Video consultation integration
- [ ] Mobile application (React Native)
- [ ] Payment gateway integration
- [ ] Insurance claim management
- [ ] Telemedicine features
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Email notifications
- [ ] SMS reminders

---

**Built with ❤️ by Team Innovators**

*Making healthcare accessible and efficient for everyone*
