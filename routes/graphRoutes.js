const express = require('express');
const { notificationGraph, responsesGraph } = require('../controllers/graphControllers');
const router = express.Router();

router.get('/notification', notificationGraph);

router.get('/responses', responsesGraph);

module.exports = router;