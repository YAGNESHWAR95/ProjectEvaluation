const express = require('express');
const {
  getSystemStats,
  getAllUsers,
  createUser,
  exportEvaluationsReport
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { validateBody } = require('../middleware/validateRequest');

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin')); // All admin paths strictly require admin role

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.post('/users', validateBody(['name', 'email', 'password', 'role', 'department']), createUser);
router.get('/reports/export', exportEvaluationsReport);

module.exports = router;
