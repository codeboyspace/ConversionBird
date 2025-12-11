const express = require('express');
const { register, login, resetPassword, getMe } = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateToken, getMe);

module.exports = router;