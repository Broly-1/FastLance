const router = require('express').Router();
const ctrl = require('../controllers/messagesController');

router.get('/inbox/:userId', ctrl.getInbox);
router.get('/conversation/:userId1/:userId2', ctrl.getConversation);
router.post('/', ctrl.create);
router.patch('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

module.exports = router;
