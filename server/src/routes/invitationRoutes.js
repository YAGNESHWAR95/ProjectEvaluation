const express = require('express');
const {
  sendInvitation,
  getMyInvitations,
  getLeaderInvitations,
  acceptInvitation,
  rejectInvitation,
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/send', restrictTo('student'), sendInvitation);
router.get('/my', restrictTo('student'), getMyInvitations);
router.get('/leader', restrictTo('student'), getLeaderInvitations);
router.post('/:token/accept', restrictTo('student'), acceptInvitation);
router.post('/:token/reject', restrictTo('student'), rejectInvitation);

module.exports = router;
