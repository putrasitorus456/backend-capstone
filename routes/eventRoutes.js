const express = require('express');
const { getEvents, createEvent, updateEvent} = require('../controllers/eventControllers');
const router = express.Router();

router.get('/', getEvents);

router.post('/', createEvent);

router.put('/:anchor_code/:streetlight_code', updateEvent);

module.exports = router;