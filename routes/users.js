const router = require('express').Router();
const ctrl = require('../controllers/usersController');

router.get('/', ctrl.getAll);
router.post('/login', ctrl.login);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/suspend', ctrl.suspend);
router.post('/:id/activate', ctrl.activate);

module.exports = router;
