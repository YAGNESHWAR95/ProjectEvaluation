const TeamInvitation = require('../models/TeamInvitation');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendEmailAlert } = require('../services/notificationService');

// Send team invitation (leader only)
const sendInvitation = async (req, res, next) => {
  try {
    const { projectId, email } = req.body;
    const inviterId = req.user.id;

    if (!projectId || !email) {
      return next(new AppError('projectId and email are required', 400));
    }

    // Find project and verify leader
    const project = await Project.findById(projectId);
    if (!project) {
      return next(new AppError('Project not found', 404));
    }
    if (project.leader.toString() !== inviterId) {
      return next(new AppError('Only the project leader can send invitations', 403));
    }
    if (project.status !== 'draft') {
      return next(new AppError('Invitations can only be sent for DRAFT projects', 400));
    }

    // Find invitee by email
    const invitee = await User.findOne({ email: email.toLowerCase().trim() });
    if (!invitee) {
      return next(new AppError('No user found with this email address', 404));
    }

    // Validate invitee
    if (invitee.role !== 'student') {
      return next(new AppError('Only students can be invited as team members', 400));
    }
    if (invitee._id.toString() === inviterId) {
      return next(new AppError('You cannot invite yourself', 400));
    }

    // Check if already a team member
    if (project.teamMembers.some(m => m.toString() === invitee._id.toString())) {
      return next(new AppError('This user is already a team member', 409));
    }

    // Check for existing active invitation
    const existingInvitation = await TeamInvitation.findOne({
      project: projectId,
      invitedUser: invitee._id,
      status: 'pending',
    });
    if (existingInvitation) {
      return next(new AppError('An active invitation already exists for this user', 409));
    }

    // Check if user is already in another project for the same deadline
    const existingMembership = await ProjectMember.findOne({ user: invitee._id });
    if (existingMembership) {
      const otherProject = await Project.findOne({
        _id: existingMembership.project,
        deadline: project.deadline,
      });
      if (otherProject) {
        return next(new AppError('This student is already part of another project for this deadline', 409));
      }
    }

    // Create invitation
    const token = TeamInvitation.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await TeamInvitation.create({
      project: projectId,
      invitedBy: inviterId,
      invitedUser: invitee._id,
      email: email.toLowerCase().trim(),
      token,
      status: 'pending',
      expiresAt,
    });

    // Create notification for invitee
    await Notification.create({
      recipient: invitee._id,
      type: 'team_invitation',
      title: 'Team Invitation',
      message: `You have been invited to join the project "${project.title}" by ${req.user.name}.`,
      relatedProject: projectId,
    });

    // Send email if enabled
    await sendEmailAlert(
      invitee.email,
      `Team Invitation: ${project.title}`,
      `You have been invited to join the project "${project.title}". Log in to accept or reject.`,
      `<p>You were invited to join <b>${project.title}</b>. Please log in to your account to respond.</p>`
    );

    await invitation.populate('invitedUser', 'name email rollNumber department');

    res.status(201).json({
      status: 'success',
      message: 'Invitation sent successfully',
      invitation,
    });
  } catch (error) {
    next(error);
  }
};

// Get invitations received by current user
const getMyInvitations = async (req, res, next) => {
  try {
    const invitations = await TeamInvitation.find({
      invitedUser: req.user.id,
    })
      .populate('project', 'title description status')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    // Expire old invitations
    const now = new Date();
    for (const inv of invitations) {
      if (inv.status === 'pending' && new Date(inv.expiresAt) < now) {
        inv.status = 'expired';
        await inv.save();
      }
    }

    res.status(200).json({
      status: 'success',
      invitations,
    });
  } catch (error) {
    next(error);
  }
};

// Get invitations sent by current user (as leader)
const getLeaderInvitations = async (req, res, next) => {
  try {
    const invitations = await TeamInvitation.find({
      invitedBy: req.user.id,
    })
      .populate('project', 'title description status')
      .populate('invitedUser', 'name email rollNumber department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      invitations,
    });
  } catch (error) {
    next(error);
  }
};

// Accept invitation
const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await TeamInvitation.findOne({ token })
      .populate('project')
      .populate('invitedBy', 'name email');

    if (!invitation) {
      return next(new AppError('Invitation not found', 404));
    }

    // Verify the accepting user is the invitee
    if (invitation.invitedUser.toString() !== req.user.id) {
      return next(new AppError('You are not authorized to accept this invitation', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new AppError(`Invitation has already been ${invitation.status}`, 400));
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return next(new AppError('This invitation has expired', 400));
    }

    // Accept invitation
    invitation.status = 'accepted';
    await invitation.save();

    // Create ProjectMember
    await ProjectMember.create({
      project: invitation.project._id,
      user: req.user.id,
      role: 'member',
      invitationStatus: 'accepted',
      joinedAt: new Date(),
    });

    // Add to Project.teamMembers array
    await Project.findByIdAndUpdate(invitation.project._id, {
      $addToSet: { teamMembers: req.user.id },
    });

    // Notify leader
    await Notification.create({
      recipient: invitation.invitedBy._id,
      type: 'invitation_accepted',
      title: 'Invitation Accepted',
      message: `${req.user.name} has accepted the invitation to join "${invitation.project.title}".`,
      relatedProject: invitation.project._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Invitation accepted. You are now a team member.',
    });
  } catch (error) {
    next(error);
  }
};

// Reject invitation
const rejectInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await TeamInvitation.findOne({ token })
      .populate('project')
      .populate('invitedBy', 'name email');

    if (!invitation) {
      return next(new AppError('Invitation not found', 404));
    }

    if (invitation.invitedUser.toString() !== req.user.id) {
      return next(new AppError('You are not authorized to reject this invitation', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new AppError(`Invitation has already been ${invitation.status}`, 400));
    }

    invitation.status = 'rejected';
    await invitation.save();

    // Notify leader
    await Notification.create({
      recipient: invitation.invitedBy._id,
      type: 'invitation_rejected',
      title: 'Invitation Rejected',
      message: `${req.user.name} has rejected the invitation to join "${invitation.project.title}".`,
      relatedProject: invitation.project._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Invitation rejected.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendInvitation,
  getMyInvitations,
  getLeaderInvitations,
  acceptInvitation,
  rejectInvitation,
};
