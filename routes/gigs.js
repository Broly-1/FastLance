const router = require('express').Router();
const ctrl = require('../controllers/gigsController');

router.get('/search', ctrl.search);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/category/:category', ctrl.getByCategory);
router.get('/seller/:sellerId', ctrl.getBySeller);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/images', ctrl.addImage);
router.post('/:id/tags', ctrl.addTag);

router.get("/admin/all", ctrl.getAdminAll);

module.exports = router;
