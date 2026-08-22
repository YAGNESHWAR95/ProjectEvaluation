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
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
    enum: ['pending', 'submitted', 'under_review', 'evaluated'],
    default: 'pending',
  },
  files: {
    reportUrl: { type: String, default: '' },
    reportHash: { type: String, default: '' },
    pptUrl: { type: String, default: '' },
    pptHash: { type: String, default: '' },
    codeZipUrl: { type: String, default: '' },
    codeZipHash: { type: String, default: '' },
  },
  plagiarismScore: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound index: Prevent any student from being in more than one team/project for the same deadline
ProjectSchema.index({ teamMembers: 1, deadline: 1 }, { unique: true });

// Index for faculty project lookup
ProjectSchema.index({ assignedFaculty: 1, status: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
