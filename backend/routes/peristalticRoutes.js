const express = require('express');
const router = express.Router();
const { 
    updatePumpSettings,
    getPumpSettings,
    getAllPumpSettings,
    stopPump
} = require('../controllers/peristalticController');

router.post('/pump/settings', updatePumpSettings);
router.get('/pump/:pumpNumber', getPumpSettings);
router.get('/pumps', getAllPumpSettings);
router.post('/pump/:pumpNumber/stop', stopPump);

module.exports = router;