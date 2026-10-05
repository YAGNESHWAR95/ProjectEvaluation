const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project leader is required'],
    index: true,
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  assignedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  deadline: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deadline',
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'evaluated', 'withdrawn'],
    default: 'draft',
  },
  files: {
    reportUrl: { type: String, default: '' },
    reportHash: { type: String, default: '' },
    reportName: { type: String, default: '' },
    pptUrl: { type: String, default: '' },
    pptHash: { type: String, default: '' },
    pptName: { type: String, default: '' },
    codeZipUrl: { type: String, default: '' },
    codeZipHash: { type: String, default: '' },
    codeZipName: { type: String, default: '' },
  },
  plagiarismScore: {
    type: Number,
    default: 0,
  },
  plagiarismResult: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlagiarismResult',
  },
  evaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evaluation',
  },
  submittedAt: {
    type: Date,
  },
  cohort: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for members pointing to teamMembers
ProjectSchema.virtual('members').get(function () {
  return this.teamMembers;
});

// Index for leader project lookup
ProjectSchema.index({ leader: 1, deadline: 1 }, { unique: true });

// Index for faculty project lookup
ProjectSchema.index({ assignedFaculty: 1, status: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
