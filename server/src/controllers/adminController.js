const User = require('../models/User');
const Project = require('../models/Project');
const Evaluation = require('../models/Evaluation');
const AppError = require('../utils/AppError');
const { exportEvaluationsToCSV } = require('../services/reportService');

// Get global system analytics
const getSystemStats = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalFaculty = await User.countDocuments({ role: 'faculty' });
    const totalProjects = await Project.countDocuments();
    
    // Status counts
    const pendingCount = await Project.countDocuments({ status: 'pending' });
    const submittedCount = await Project.countDocuments({ status: 'submitted' });
    const underReviewCount = await Project.countDocuments({ status: 'under_review' });
    const evaluatedCount = await Project.countDocuments({ status: 'evaluated' });

    // Calculate Average Scores
    const publishedEvals = await Evaluation.find({ isPublished: true });
    let averageScore = 0;
    if (publishedEvals.length > 0) {
      const sum = publishedEvals.reduce((acc, curr) => acc + curr.totalScore, 0);
      averageScore = (sum / publishedEvals.length).toFixed(1);
    }

    // Chart Data 1: Status distribution
    const statusStats = [
      { name: 'Pending Review', value: pendingCount + submittedCount },
      { name: 'Under Review', value: underReviewCount },
      { name: 'Evaluated', value: evaluatedCount }
    ];

    // Chart Data 2: Real department-wise submissions via aggregation
    const deptStats = await Project.aggregate([
      // Unwind team members so we can join with Users
      { $unwind: '$teamMembers' },
      // Lookup the user document for each team member
      {
        $lookup: {
          from: 'users',
          localField: 'teamMembers',
          foreignField: '_id',
          as: 'memberInfo',
        },
      },
      { $unwind: '$memberInfo' },
      // Group by project ID and department (to avoid counting a project multiple times per dept)
      {
        $group: {
          _id: { projectId: '$_id', department: '$memberInfo.department' },
        },
      },
      // Now group by department only to count unique projects per department
      {
        $group: {
          _id: '$_id.department',
          submissions: { $sum: 1 },
        },
      },
      // Format output
      {
        $project: {
          _id: 0,
          department: '$_id',
          submissions: 1,
        },
      },
      { $sort: { submissions: -1 } },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalStudents,
          totalFaculty,
          totalProjects,
          evaluatedProjects: evaluatedCount,
          averageScore,
        },
        statusStats,
        deptStats,
      }
    });
  } catch (error) {
    next(error);
  }
};

// List all registered users (Admin only) with pagination
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 'success',
      users,
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

// Create user manually (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, rollNumber, facultyId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    const userData = { name, email, password, role, department };
    if (role === 'student') userData.rollNumber = rollNumber;
    else if (role === 'faculty') userData.facultyId = facultyId;

    const user = await User.create(userData);
    
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      status: 'success',
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Export evaluations sheet (CSV download)
const exportEvaluationsReport = async (req, res, next) => {
  try {
    const evaluations = await Evaluation.find()
      .populate({
        path: 'projectId',
        populate: { path: 'teamMembers', select: 'name email' }
      })
      .populate('evaluatorId', 'name email department')
      .sort({ updatedAt: -1 });

    const csvData = exportEvaluationsToCSV(evaluations);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=evaluations_report.csv');
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSystemStats,
  getAllUsers,
  createUser,
  exportEvaluationsReport,
};
