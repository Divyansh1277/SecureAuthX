/**
 * SecureAuthX – Main Server Entry Point
 * Multi-Layer OS-Inspired Authentication System
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// ─── Body Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── Static Files ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));

// ─── Page Routes ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'signup.html'));
});

app.get('/mfa-setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'mfa-setup.html'));
});

app.get('/verify-otp', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'verify-otp.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'user-dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'admin-dashboard.html'));
});

app.get('/access-denied', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'access-denied.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'forgot-password.html'));
});

// ─── Start Server (async for DB init) ─────────────────────────────
async function startServer() {
  try {
    // Initialize database first
    await initDatabase();

    // Import routes AFTER database is initialized
    const authRoutes = require('./backend/routes/auth');
    const userRoutes = require('./backend/routes/user');
    const adminRoutes = require('./backend/routes/admin');

    // ─── API Routes ───────────────────────────────────────────────
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/admin', adminRoutes);

    // ─── Global Error Handler ─────────────────────────────────────
    app.use((err, req, res, next) => {
      console.error('Unhandled Error:', err.message);
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
      });
    });

    // ─── 404 Handler ──────────────────────────────────────────────
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });

    app.listen(PORT, () => {
      console.log(`\n╔══════════════════════════════════════════════╗`);
      console.log(`║   SecureAuthX Server Running                 ║`);
      console.log(`║   http://localhost:${PORT}                      ║`);
      console.log(`║   Environment: ${process.env.NODE_ENV || 'development'}               ║`);
      console.log(`╚══════════════════════════════════════════════╝\n`);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
