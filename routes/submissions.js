const router = require('express').Router();
const ctrl = require('../controllers/submissionsController');

router.get('/order/:orderId', ctrl.getByOrder);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
