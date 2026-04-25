/**
 * Admin Routes – Protected admin-only endpoints
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getAllUsers);
router.get('/logs', adminController.getAllLogs);
router.get('/chart-data', adminController.getChartData);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
