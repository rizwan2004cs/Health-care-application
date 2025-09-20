# Bizil Health Care

A comprehensive healthcare management system built with Node.js, Express, MongoDB, and EJS. This application provides separate portals for patients, doctors, and administrators with role-based access control and verification systems.

**Created by Team Innovators**

## Features

- **Multi-Portal System**: Separate interfaces for Patients, Doctors, and Administrators
- **User Authentication**: Secure login/signup with session management
- **Doctor Verification**: Admin approval system for doctor registrations
- **Profile Management**: Comprehensive profile completion for all user types
- **Modern UI**: Glass-morphism design with responsive layouts
- **Form Validation**: Client-side and server-side validation

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/downloads)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/rizwan2004cs/Health-care.git
cd Health-care
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

**Windows:**
```bash
# Start MongoDB service
net start MongoDB
```

**macOS:**
```bash
# Using Homebrew
brew services start mongodb-community
```

**Linux:**
```bash
# Using systemctl
sudo systemctl start mongod
```

### 4. Environment Setup

The application uses default configurations. Make sure MongoDB is running on the default port `27017`.

### 5. Run the Application

Start the server:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The application will be available at: **http://localhost:8080**

## Default Admin Account

The application automatically creates a default admin account on first run:

- **Email**: `admin@healthcare.com`
- **Username**: `admin`
- **Password**: `admin123`
- **Portal**: http://localhost:8080/admin/login

## Portal Access

### Patient Portal
- **URL**: http://localhost:8080/patient/login
- **Features**: Health profile management, appointment booking, medical records

### Doctor Portal
- **URL**: http://localhost:8080/doctor/login
- **Features**: Patient management, schedule management, prescriptions
- **Note**: Doctor accounts require admin verification before login

### Admin Portal
- **URL**: http://localhost:8080/admin/login
- **Features**: User management, doctor verification, system administration

## Application Structure

```
Health-care/
├── models/          # Database schemas
├── routes/          # Express routes
├── views/           # EJS templates
├── public/          # Static files (CSS, JS, images)
├── utils/           # Utility functions
├── app.js           # Main application file
└── package.json     # Dependencies and scripts
```

## Usage

1. **Start the application** using the steps above
2. **Visit** http://localhost:8080 to see the portal selection page
3. **Sign up** as a patient or doctor, or **login** as admin
4. **Complete your profile** after registration
5. **For doctors**: Wait for admin verification before accessing the dashboard

## Development

### Available Scripts

```bash
# Start the application
npm start

# Start with nodemon for development
npm run dev

# (Add other scripts as needed)
```

### Database

The application uses MongoDB with the following collections:
- `users` - Authentication and portal information
- `patients` - Patient profiles and health data
- `doctors` - Doctor profiles and verification status
- `admins` - Administrator profiles and permissions

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check if port 27017 is available

2. **Port 8080 Already in Use**
   - Change the port in `app.js` or stop the process using port 8080

3. **Dependencies Issues**
   - Delete `node_modules` and run `npm install` again

4. **Database Issues**
   - Restart MongoDB service
   - Check MongoDB logs for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please create an issue in the GitHub repository.