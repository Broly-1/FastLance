const router = require('express').Router();
const ctrl = require('../controllers/disputesController');

router.get('/', ctrl.getAll);
router.get('/order/:orderId', ctrl.getByOrder);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
