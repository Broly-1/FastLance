const router = require('express').Router();
const ctrl = require('../controllers/reviewsController');

router.get('/gig/:gigId', ctrl.getByGig);
router.get('/order/:orderId', ctrl.getByOrder);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
