const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/telegramchatControllers');

router.post('/', sendMessage);

module.exports = router;