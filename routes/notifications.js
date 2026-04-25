const router = require('express').Router();
const ctrl = require('../controllers/notificationsController');

router.get('/user/:userId', ctrl.getByUser);
router.get('/user/:userId/unread-count', ctrl.getUnreadCount);
router.post('/', ctrl.create);
router.patch('/:id/read', ctrl.markRead);
router.patch('/user/:userId/read-all', ctrl.markAllRead);
router.delete('/:id', ctrl.remove);

module.exports = router;
