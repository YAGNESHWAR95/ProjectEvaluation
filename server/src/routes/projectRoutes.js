const express = require('express');
const {
  getUploadUrl,
  submitProject,
  getProjects,
  getProjectById,
  getStudents,
  assignReviewer,
  localUploadDirect
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Direct local upload route (emulates cloud direct upload target)
router.post('/local-upload-direct', upload.single('file'), localUploadDirect);

// Authenticated routes
router.use(protect);

router.get('/upload-url', getUploadUrl);
router.get('/students', getStudents);
router.post('/submit', restrictTo('student'), submitProject);
router.get('/', getProjects);
router.post('/assign-reviewer', restrictTo('admin'), assignReviewer);
router.get('/:id', getProjectById);

module.exports = router;
