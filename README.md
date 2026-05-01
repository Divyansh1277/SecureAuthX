# SecureAuthX

**SecureAuthX** is a Multi-Layer OS-Inspired Authentication System. It provides a robust, secure, and fully-featured authentication framework built with Node.js and Express, simulating an OS-level login experience. 

## Features

- **Multi-Layer Authentication:** Secure user registration, login, and robust password hashing using `bcrypt`.
- **Role-Based Access Control (RBAC):** Separate environments and dashboards for Users and Administrators.
- **Two-Factor Authentication (2FA/MFA):** Time-based One-Time Password (TOTP) support utilizing Google Authenticator/Authy (via `speakeasy` and `qrcode`).
- **Secure Session Management:** JSON Web Token (JWT) based authentication.
- **Admin Dashboard:** Administrative controls for monitoring users, viewing system logs, and managing/deleting users directly from the UI.
- **Rate Limiting & Security Headers:** Built-in brute-force protection using `express-rate-limit` and secure HTTP headers via `helmet`.
- **Email OTP & Recovery:** Forgot password and Email OTP flows supported by `nodemailer`.
- **Self-Contained Database:** Zero-configuration SQLite-based database via `sql.js`, with automatic initialization and background saving.
- **Activity Logging:** Comprehensive tracking of login attempts and user actions.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** sql.js (JavaScript SQLite)
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Security:** bcrypt, jsonwebtoken, speakeasy, helmet, cors
- **Utilities:** nodemailer, qrcode, dotenv

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (Node Package Manager)

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd "d:\os project\OS project\OS project"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Ensure your `.env` file in the root directory contains the necessary configuration:
   ```env
   # Server
   PORT=3000
   
   # JWT
   JWT_SECRET=secureauthx_super_secret_key_2026_change_in_production
   
   # Email configuration for OTP & Recovery
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=your_email@gmail.com
   
   # Admin Setup Code
   ADMIN_SETUP_CODE=ADMIN2026SECURE
   ```

4. **Start the Application:**
   ```bash
   # Development mode
   npm run dev
   
   # Or standard start
   npm start
   ```

5. **Access the Web Application:**
   Open your browser and navigate to: `http://localhost:3000`

### Default Administrator

When the server initializes for the first time, it automatically creates a default admin account.

- **Username:** `admin`
- **Email:** `admin@secureauthx.com`
- **Password:** `Admin@12345`

*Note: It is highly recommended to change these credentials upon your first login.*

## Project Structure

- `/backend` - API routes, controllers, middleware, and models.
- `/database` - Database initialization script and SQLite data file (`secureauthx.db`).
- `/frontend` - Static assets, HTML pages, CSS, and client-side JavaScript.
- `server.js` - Main application entry point.

## License

This project is licensed under the MIT License.