const express = require('express');
const { createApiKey, getApiKeys, updateApiKey, deleteApiKey } = require('../controllers/ApiKeyController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken); // All API key routes require auth

router.post('/', createApiKey);
router.get('/', getApiKeys);
router.put('/:id', updateApiKey);
router.delete('/:id', deleteApiKey);

module.exports = router;