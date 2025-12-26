const express = require('express');
const { publishGetInfo, publishTurnOn, publishTurnOff, publishTurnOnPortfolio, publishTurnOffPortfolio } = require('../controllers/mqttControllers');
const router = express.Router();

// router.post('/info', publishGetInfo);
// router.post('/on', publishTurnOn); PAKE INI KALO REAL CASE
router.post('/on', publishTurnOnPortfolio);
// router.post('/off', publishTurnOff); PAKE INI KALO REAL CASE
router.post('/off', publishTurnOffPortfolio);

module.exports = router;