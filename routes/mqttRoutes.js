const express = require('express');
const { publishGetInfo, publishTurnOn, publishTurnOff } = require('../controllers/mqttControllers');
const router = express.Router();

router.post('/info', publishGetInfo);
router.post('/on', publishTurnOn);
router.post('/off', publishTurnOff);

module.exports = router;