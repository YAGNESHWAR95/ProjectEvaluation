const fs = require('fs');
const crypto = require('crypto');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Deadline = require('../models/Deadline');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { generatePresignedUrl } = require('../services/storageService');
const { sendEmailAlert } = require('../services/notificationService');
const { runPlagiarismCheck } = require('../services/plagiarismService');

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

// Create project (DRAFT status) - Student only
const createProject = async (req, res, next) => {
  try {
    const { title, description, deadlineId } = req.body;
    const leaderId = req.user.id;

    // Validate user is a student
    if (req.user.role !== 'student') {
      return next(new AppError('Only students can create projects', 403));
    }

    if (!title || !description || !deadlineId) {
      return next(new AppError('Title, description, and deadlineId are required', 400));
    }

    // Validate deadline
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
      return next(new AppError('Submission deadline has passed', 400));
    }

    // Check if this student already leads a project for this deadline
    const existingProject = await Project.findOne({ leader: leaderId, deadline: deadlineId });
    if (existingProject) {
      return next(new AppError('You already have a project for this deadline', 409));
    }

    // Check if student is already a member of another project for this deadline
    const existingMembership = await ProjectMember.findOne({ user: leaderId }).populate('project');
    if (existingMembership) {
      const memberProject = await Project.findOne({
        _id: existingMembership.project,
        deadline: deadlineId,
      });
      if (memberProject) {
        return next(new AppError('You are already part of another project for this deadline', 409));
      }
    }

    // Create project with leader
    const newProject = await Project.create({
      title,
      description,
      leader: leaderId,
      teamMembers: [leaderId],
      deadline: deadlineId,
      cohort: deadline.batch || '',
      department: req.user.department || '',
      status: 'draft',
    });

    // Create ProjectMember record for leader
    await ProjectMember.create({
      project: newProject._id,
      user: leaderId,
      role: 'leader',
      invitationStatus: 'accepted',
      joinedAt: new Date(),
    });

    const populated = await Project.findById(newProject._id)
      .populate('leader', 'name email rollNumber department')
      .populate('teamMembers', 'name email rollNumber department')
      .populate('deadline', 'title batch submissionEndDate');

    res.status(201).json({
      status: 'success',
      project: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Get my projects (student sees their projects, faculty sees assigned, admin sees all)
const getProjects = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      query.teamMembers = req.user.id;
    } else if (req.user.role === 'faculty') {
      query.assignedFaculty = req.user.id;
    }
    // Admin gets all projects (query is empty)

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('leader', 'name email rollNumber department')
      .populate('teamMembers', 'name email rollNumber department')
      .populate('assignedFaculty', 'name email facultyId department')
      .populate('deadline', 'title batch submissionEndDate submissionStartDate')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 'success',
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single project details
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('leader', 'name email rollNumber department')
      .populate('teamMembers', 'name email rollNumber department')
      .populate('assignedFaculty', 'name email facultyId department')
      .populate('deadline', 'title batch submissionEndDate submissionStartDate')
      .populate('plagiarismResult')
      .populate('evaluation');

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    // Role-based restrictions
    if (req.user.role === 'student' && !project.teamMembers.some(m => m._id.toString() === req.user.id)) {
      return next(new AppError('You are not authorized to view this project', 403));
    }
    if (req.user.role === 'faculty' && project.assignedFaculty?._id?.toString() !== req.user.id) {
      return next(new AppError('You are not authorized to view this project', 403));
    }

    // Also fetch project members
    const members = await ProjectMember.find({ project: project._id })
      .populate('user', 'name email rollNumber department');

    res.status(200).json({
      status: 'success',
      project,
      members,
    });
  } catch (error) {
    next(error);
  }
};

// Update project (leader only, DRAFT status only)
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    // Only leader can edit
    if (project.leader.toString() !== req.user.id) {
      return next(new AppError('Only the project leader can edit this project', 403));
    }

    // Only DRAFT projects can be edited
    if (project.status !== 'draft') {
      return next(new AppError('Project can only be edited in DRAFT status', 400));
    }

    const { title, description } = req.body;
    if (title) project.title = title;
    if (description) project.description = description;

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('leader', 'name email rollNumber department')
      .populate('teamMembers', 'name email rollNumber department')
      .populate('deadline', 'title batch submissionEndDate');

    res.status(200).json({
      status: 'success',
      project: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Upload file to project (report/presentation/source)
const uploadProjectFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const { purpose } = req.body;
    if (!purpose || !['report', 'presentation', 'source'].includes(purpose)) {
      // Clean up uploaded file
      if (req.file.path) fs.unlinkSync(req.file.path);
      return next(new AppError('File purpose must be one of: report, presentation, source', 400));
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return next(new AppError('Project not found', 404));
    }

    // Only leader can upload
    if (project.leader.toString() !== req.user.id) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return next(new AppError('Only the project leader can upload files', 403));
    }

    // Only DRAFT projects can receive file uploads
    if (project.status !== 'draft') {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return next(new AppError('Files can only be uploaded to DRAFT projects', 400));
    }

    // Validate file extension matches purpose
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const purposeExtMap = {
      report: ['pdf'],
      presentation: ['ppt', 'pptx'],
      source: ['zip'],
    };

    if (!purposeExtMap[purpose].includes(ext)) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return next(new AppError(`Invalid file type for purpose "${purpose}". Expected: ${purposeExtMap[purpose].join(', ')}`, 400));
    }

    // Compute SHA-256 hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Create file URL
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const fileUrl = `${serverUrl}/uploads/${req.file.filename}`;

    // Remove previous file if replacing
    const fieldMap = {
      report: { url: 'reportUrl', hash: 'reportHash', name: 'reportName' },
      presentation: { url: 'pptUrl', hash: 'pptHash', name: 'pptName' },
      source: { url: 'codeZipUrl', hash: 'codeZipHash', name: 'codeZipName' },
    };

    const fields = fieldMap[purpose];

    // Delete old file from disk if it exists
    if (project.files[fields.url]) {
      const oldFilename = project.files[fields.url].split('/uploads/')[1];
      if (oldFilename) {
        const oldPath = require('path').join(__dirname, '../../uploads', oldFilename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    project.files[fields.url] = fileUrl;
    project.files[fields.hash] = fileHash;
    project.files[fields.name] = req.file.originalname;
    await project.save();

    res.status(200).json({
      status: 'success',
      url: fileUrl,
      hash: fileHash,
      originalName: req.file.originalname,
      size: req.file.size,
      purpose,
    });
  } catch (error) {
    next(error);
  }
};

// Submit project (changes status from DRAFT to SUBMITTED)
const submitProject = async (req, res, next) => {
  try {
    let projectId = req.params.id || req.body.projectId;
    let project;

    if (projectId) {
      project = await Project.findById(projectId);
      if (!project) {
        return next(new AppError('Project not found', 404));
      }

      // Only leader can submit
      if (project.leader.toString() !== req.user.id) {
        return next(new AppError('Only the project leader can submit this project', 403));
      }

      if (project.status === 'withdrawn') {
        return next(new AppError('Cannot submit a withdrawn project', 400));
      }

      if (project.status === 'evaluated') {
        return next(new AppError('Project has already been evaluated', 400));
      }

      // Must be in DRAFT status
      if (project.status !== 'draft') {
        return next(new AppError('Project can only be submitted from DRAFT status', 400));
      }
    } else if (req.body.title) {
      // Legacy single-step create + submit flow
      const { title, description, deadlineId, files } = req.body;
      const leaderId = req.user.id;

      if (!title || !description || !deadlineId) {
        return next(new AppError('Title, description, and deadlineId are required', 400));
      }

      const deadline = await Deadline.findById(deadlineId);
      if (!deadline || !deadline.isActive) {
        return next(new AppError('Invalid or inactive deadline', 400));
      }

      project = await Project.create({
        title,
        description,
        leader: leaderId,
        teamMembers: [leaderId],
        deadline: deadlineId,
        cohort: deadline.batch || '',
        department: req.user.department || '',
        status: 'draft',
        files: files || {},
      });

      await ProjectMember.create({
        project: project._id,
        user: leaderId,
        role: 'leader',
        invitationStatus: 'accepted',
        joinedAt: new Date(),
      });
    } else {
      return next(new AppError('Project ID or project details are required', 400));
    }

    // Validate deadline
    const deadline = await Deadline.findById(project.deadline);
    if (!deadline) {
      return next(new AppError('Project deadline not found', 404));
    }
    if (!deadline.isActive) {
      return next(new AppError('Deadline is no longer active', 400));
    }
    const now = new Date();
    if (now > new Date(deadline.submissionEndDate)) {
      return next(new AppError('Submission deadline has passed', 400));
    }

    // Validate all three files are uploaded
    if (!project.files.reportUrl) {
      return next(new AppError('Project report (PDF) is required before submission', 400));
    }
    if (!project.files.pptUrl) {
      return next(new AppError('Project presentation (PPT/PPTX) is required before submission', 400));
    }
    if (!project.files.codeZipUrl) {
      return next(new AppError('Project source code (ZIP) is required before submission', 400));
    }

    // Run plagiarism check
    const plagiarismResult = await runPlagiarismCheck(project._id);
    if (plagiarismResult) {
      project.plagiarismResult = plagiarismResult._id;
      project.plagiarismScore = plagiarismResult.similarityScore;
    }

    // Update status
    project.status = 'submitted';
    project.submittedAt = now;
    await project.save();

    // Notify team members
    const teamMembers = await User.find({ _id: { $in: project.teamMembers } });
    for (const member of teamMembers) {
      await Notification.create({
        recipient: member._id,
        type: 'project_submitted',
        title: 'Project Submitted',
        message: `Project "${project.title}" has been submitted successfully.`,
        relatedProject: project._id,
      });
    }

    // Email alert (won't fail if email is disabled)
    const teamEmails = teamMembers.map(u => u.email);
    await sendEmailAlert(
      teamEmails.join(','),
      `Project Submitted: ${project.title}`,
      `Your project "${project.title}" has been successfully submitted.`,
      `<h3>Submission Confirmation</h3><p>Your project <b>${project.title}</b> was recorded at ${now.toLocaleString()}.</p>`
    );

    const populated = await Project.findById(project._id)
      .populate('leader', 'name email rollNumber department')
      .populate('teamMembers', 'name email rollNumber department')
      .populate('deadline', 'title batch submissionEndDate')
      .populate('plagiarismResult');

    res.status(200).json({
      status: 'success',
      project: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Withdraw project (student leader only)
const withdrawProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    if (project.leader.toString() !== req.user.id) {
      return next(new AppError('Only the project leader can withdraw this project', 403));
    }

    if (project.status === 'evaluated') {
      return next(new AppError('Evaluated projects cannot be withdrawn', 400));
    }

    if (project.status === 'withdrawn') {
      return next(new AppError('Project is already withdrawn', 400));
    }

    project.status = 'withdrawn';
    await project.save();

    // Notify team members
    const teamMembers = await User.find({ _id: { $in: project.teamMembers } });
    for (const member of teamMembers) {
      await Notification.create({
        recipient: member._id,
        type: 'project_status',
        title: 'Project Withdrawn',
        message: `Project "${project.title}" has been withdrawn by the leader.`,
        relatedProject: project._id,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Project withdrawn successfully',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// Get active deadlines for student
const getStudentDeadlines = async (req, res, next) => {
  try {
    const deadlines = await Deadline.find({ isActive: true }).sort({ submissionEndDate: 1 });
    res.status(200).json({
      status: 'success',
      deadlines,
    });
  } catch (error) {
    next(error);
  }
};

// Get all student users (for team member reference)
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

    // Notify faculty
    await Notification.create({
      recipient: facultyId,
      type: 'faculty_assigned',
      title: 'Project Assigned for Review',
      message: `You have been assigned to evaluate project "${project.title}".`,
      relatedProject: project._id,
    });

    // Notify leader
    await Notification.create({
      recipient: project.leader,
      type: 'faculty_assigned',
      title: 'Faculty Reviewer Assigned',
      message: `Faculty ${faculty.name} has been assigned to review your project "${project.title}".`,
      relatedProject: project._id,
    });

    // Email alert
    await sendEmailAlert(
      faculty.email,
      `Project Assigned for Evaluation: ${project.title}`,
      `You have been assigned to evaluate the student project: "${project.title}".`,
      `<p>You have a pending grading evaluation for <b>${project.title}</b>.</p>`
    );

    const populated = await Project.findById(project._id)
      .populate('leader', 'name email rollNumber department')
      .populate('teamMembers', 'name email rollNumber department')
      .populate('assignedFaculty', 'name email facultyId department')
      .populate('deadline', 'title batch submissionEndDate');

    res.status(200).json({
      status: 'success',
      message: 'Reviewer assigned successfully',
      project: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Local direct upload handler (fallback when Cloudinary unavailable)
const localUploadDirect = (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const fileUrl = `${serverUrl}/uploads/${req.file.filename}`;

    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    res.status(200).json({
      status: 'success',
      url: fileUrl,
      hash: fileHash,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
