const express = require('express');
const { getAllNotification, getNotificationByCode, createNotification } = require('../controllers/notificationControllers');
const router = express.Router();

router.get('/', getAllNotification);

router.get('/:anchor_code/:streetlight_code', getNotificationByCode);

router.post('/', createNotification);

module.exports = router;