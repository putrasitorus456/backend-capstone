const express = require('express');
const { getAllResponses, getResponseById, createResponse } = require('../controllers/responsesControllers');
const router = express.Router();

router.get('/', getAllResponses);

router.get('/:id', getResponseById);

router.post('/', createResponse);

module.exports = router;