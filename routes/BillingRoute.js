const express = require('express');
const { createSubscription, getSubscriptionStatus, cancelSubscription, webhook } = require('../controllers/BillingController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken); // Most billing routes require auth

router.post('/subscription', createSubscription);
router.get('/subscription', getSubscriptionStatus);
router.delete('/subscription', cancelSubscription);

// Webhook doesn't need auth
router.post('/webhook', webhook);

module.exports = router;