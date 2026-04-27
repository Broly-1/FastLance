const router = require('express').Router();
const ctrl = require('../controllers/walletController');

router.get('/user/:userId', ctrl.getByUser);
router.get('/user/:userId/balance', ctrl.getBalance);
router.post('/', ctrl.create);
router.post('/refund', ctrl.refund);

module.exports = router;
