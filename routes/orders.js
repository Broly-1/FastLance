const router = require('express').Router();
const ctrl = require('../controllers/ordersController');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/buyer/:buyerId', ctrl.getByBuyer);
router.get('/seller/:sellerId', ctrl.getBySeller);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id', ctrl.remove);

module.exports = router;
