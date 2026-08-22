const crypto = require('crypto');
const Project = require('../models/Project');
const Deadline = require('../models/Deadline');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { generatePresignedUrl } = require('../services/storageService');
const { sendEmailAlert } = require('../services/notificationService');

// Request presigned/direct upload URL
const getUploadUrl = async (req, res, next) => {
  try {
    const { filename, fileType } = req.query;
    if (!filename || !fileType) {
      return next(new AppError('Filename and fileType are required in query parameters', 400));
    }

    const uploadData = generatePresignedUrl(filename, fileType);
    res.status(200).json({
      status: 'success',
      data: uploadData,
    });
  } catch (error) {
    next(error);
  }
};

// Create project / Submit files metadata
const submitProject = async (req, res, next) => {
  try {
    const { title, description, teamMembers, deadlineId, files } = req.body;

    // Validate inputs
    if (!title || !description || !teamMembers || !teamMembers.length || !deadlineId) {
      return next(new AppError('Missing required project submission fields', 400));
    }

    // 1. Deadline Enforcement Check
    const deadline = await Deadline.findById(deadlineId);
    if (!deadline) {
      return next(new AppError('Invalid deadline specified', 404));
    }
    if (!deadline.isActive) {
      return next(new AppError('This deadline is no longer active', 400));
    }
    
    const now = new Date();
    if (now < new Date(deadline.submissionStartDate)) {
      return next(new AppError('Submission window has not opened yet', 400));
    }
    if (now > new Date(deadline.submissionEndDate)) {
      return next(new AppError('Submission deadline has passed. Submissions locked.', 400));
    }

    // 2. Prevent Double Enrollment (Team Submission Lock)
    // Find if any team member is already associated with a project for this deadline
    const duplicate = await Project.findOne({
      teamMembers: { $in: teamMembers },
      deadline: deadlineId,
    }).populate('teamMembers', 'name email');

    if (duplicate) {
      const duplicateNames = duplicate.teamMembers
        .filter(m => teamMembers.includes(m._id.toString()))
        .map(m => m.name)
        .join(', ');
      return next(new AppError(`Double Enrollment Lock: Students [${duplicateNames}] are already associated with a project submission for this deadline.`, 409));
    }

    // Check if team members exist and are students
    const users = await User.find({ _id: { $in: teamMembers } });
    if (users.length !== teamMembers.length) {
      return next(new AppError('One or more team members do not exist', 400));
    }
    const nonStudents = users.filter(u => u.role !== 'student');
    if (nonStudents.length > 0) {
      return next(new AppError(`Only students can be team members. Non-student: ${nonStudents[0].name}`, 400));
    }

    // Set plagiarism score mock (e.g. random value between 5% and 22% for demo realism)
    const plagiarismScore = Math.floor(Math.random() * 18) + 4;

    // Create the project entry
    const newProject = await Project.create({
      title,
      description,
      teamMembers,
      deadline: deadlineId,
      status: 'submitted',
      files: {
        reportUrl: files?.reportUrl || '',
        reportHash: files?.reportHash || '',
        pptUrl: files?.pptUrl || '',
        pptHash: files?.pptHash || '',
        codeZipUrl: files?.codeZipUrl || '',
        codeZipHash: files?.codeZipHash || '',
      },
      plagiarismScore,
      submittedAt: now,
    });

    // Notify team members
    const teamEmails = users.map(u => u.email);
    await sendEmailAlert(
      teamEmails.join(','),
      `Project Submitted: ${title}`,
      `Your project "${title}" has been successfully submitted for deadline "${deadline.title}".`,
      `<h3>Submission Confirmation</h3><p>Your team project <b>${title}</b> was recorded successfully at ${now.toLocaleString()}.</p>`
    );

    res.status(201).json({
      status: 'success',
      project: newProject,
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve Projects based on roles
const getProjects = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      // Find projects where user is in the team
      query.teamMembers = req.user.id;
    } else if (req.user.role === 'faculty') {
      // Find projects assigned to this faculty member
      query.assignedFaculty = req.user.id;
    }
    // Admin gets all projects (query is empty)

    const projects = await Project.find(query)
      .populate('teamMembers', 'name email rollNumber department')
      .populate('assignedFaculty', 'name email facultyId department')
      .populate('deadline', 'title batch submissionEndDate')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      projects,
    });
  } catch (error) {
    next(error);
  }
};

// Get single project details
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('teamMembers', 'name email rollNumber department')
      .populate('assignedFaculty', 'name email facultyId department')
      .populate('deadline', 'title batch submissionEndDate');

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    // Role-based restrictions
    if (req.user.role === 'student' && !project.teamMembers.some(m => m._id.toString() === req.user.id)) {
      return next(new AppError('You are not authorized to view this project', 403));
    }
    if (req.user.role === 'faculty' && project.assignedFaculty?._id.toString() !== req.user.id) {
      return next(new AppError('You are not authorized to view this project', 403));
    }

    res.status(200).json({
      status: 'success',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// Get all student users (for team member selection)
const getStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' }).select('name email rollNumber department').sort({ name: 1 });
    res.status(200).json({
      status: 'success',
      users: students,
    });
  } catch (error) {
    next(error);
  }
};

// Assign reviewer (Admin only)
const assignReviewer = async (req, res, next) => {
  try {
    const { projectId, facultyId } = req.body;

    if (!projectId || !facultyId) {
      return next(new AppError('projectId and facultyId are required', 400));
    }

    const project = await Project.findById(projectId);
    if (!project) return next(new AppError('Project not found', 404));

    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== 'faculty') {
      return next(new AppError('Invalid faculty reviewer account ID', 400));
    }

    project.assignedFaculty = facultyId;
    project.status = 'under_review';
    await project.save();

    // Alert faculty
    await sendEmailAlert(
      faculty.email,
      `Project Assigned for Evaluation: ${project.title}`,
      `You have been assigned to evaluate the student project: "${project.title}".`,
      `<p>You have a pending grading evaluation for <b>${project.title}</b>.</p>`
    );

    res.status(200).json({
      status: 'success',
      message: 'Reviewer assigned successfully',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// Local direct upload handler (emulates cloud bucket save)
const localUploadDirect = (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Create absolute access path
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const fileUrl = `${serverUrl}/uploads/${req.file.filename}`;

    res.status(200).json({
      status: 'success',
      url: fileUrl,
      hash: crypto.createHash('sha256').update(req.file.filename).digest('hex'),
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUploadUrl,
  submitProject,
  getProjects,
  getProjectById,
  getStudents,
  assignReviewer,
  localUploadDirect,
};
