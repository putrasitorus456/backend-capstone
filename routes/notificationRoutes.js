const express = require('express');
const { getAllNotification, getNotificationById, createNotification } = require('../controllers/notificationControllers');
const router = express.Router();

router.get('/', getAllNotification);

router.get('/:id', getNotificationById);

router.post('/', createNotification);

module.exports = router;