const express = require('express');
const { createStreetlight, getStreetlights, getStreetlightById, updateStreetlight, deleteStreetlight, getStreetlightStats} = require('../controllers/streetlightControllers');
const router = express.Router();

router.get('/stats', getStreetlightStats);

router.post('/', createStreetlight);

router.get('/', getStreetlights);

router.get('/:id', getStreetlightById);

router.put('/:id', updateStreetlight);

router.delete('/:id', deleteStreetlight);

module.exports = router;