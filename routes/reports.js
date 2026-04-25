const router = require('express').Router();
const ctrl = require('../controllers/reportsController');

router.get('/top-sellers', ctrl.topSellers);
router.get('/top-gigs', ctrl.topGigs);
router.get('/trending-gigs', ctrl.trendingGigs);
router.get('/category-stats', ctrl.categoryStats);
router.get('/seller/:id/earnings', ctrl.sellerEarnings);
router.get('/seller/:id/dashboard', ctrl.sellerDashboard);
router.get('/buyer/:id/history', ctrl.buyerHistory);
router.get('/profitability', ctrl.profitability);
router.get('/revenue-by-month', ctrl.revenueByMonth);
router.get('/overdue-milestones', ctrl.overdueMilestones);
router.get('/platform-summary', ctrl.platformSummary);
router.get('/user-feedback/:id', ctrl.userFeedback);

module.exports = router;
