/**
 * User Routes – Protected user dashboard endpoints
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', userController.getDashboard);
router.get('/login-history', userController.getLoginHistory);
router.get('/security-status', userController.getSecurityStatus);

module.exports = router;
