const router = require('express').Router();
const ctrl = require('../controllers/invoicesController');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/order/:orderId', ctrl.getByOrder);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/pay', ctrl.markPaid);
router.delete('/:id', ctrl.remove);

module.exports = router;
