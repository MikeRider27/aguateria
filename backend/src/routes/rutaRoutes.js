const express = require('express');
const { getHojaRuta, getVisitasSugeridas } = require('../controllers/rutaController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getHojaRuta);
router.get('/visitas', getVisitasSugeridas);

module.exports = router;
