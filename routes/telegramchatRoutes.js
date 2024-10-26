const express = require('express');
const router = express.Router();
const { sendMessage, handleTelegramCallbackQuery } = require('../controllers/telegramchatControllers');

router.post('/', sendMessage);

router.post('/callback_query', handleTelegramCallbackQuery);

module.exports = router;