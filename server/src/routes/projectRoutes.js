const express = require('express');
const {
  getUploadUrl,
  createProject,
  submitProject,
  withdrawProject,
  getStudentDeadlines,
  getProjects,
  getProjectById,
  updateProject,
  uploadProjectFile,
  getStudents,
  assignReviewer,
  localUploadDirect,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Authenticated routes
router.use(protect);

// Direct local upload route (requires authentication)
router.post('/local-upload-direct', upload.single('file'), localUploadDirect);
router.get('/upload-url', getUploadUrl);
router.get('/students', getStudents);
router.get('/deadlines', getStudentDeadlines);
router.get('/my', getProjects);

// Project creation (DRAFT)
router.post('/', restrictTo('student'), createProject);

// Backward-compatible single-step submit
router.post('/submit', restrictTo('student'), submitProject);

// Admin reviewer assignment
router.post('/assign-reviewer', restrictTo('admin'), assignReviewer);

// Specific project routes
router.get('/:id', getProjectById);
router.put('/:id', restrictTo('student'), updateProject);
router.post('/:id/files', restrictTo('student'), upload.single('file'), uploadProjectFile);
router.post('/:id/submit', restrictTo('student'), submitProject);
router.post('/:id/withdraw', restrictTo('student'), withdrawProject);

// List projects
router.get('/', getProjects);

module.exports = router;
