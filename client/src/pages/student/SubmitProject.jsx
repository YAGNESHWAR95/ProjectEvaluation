import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  getProjects,
  createProject,
  uploadProjectFile,
  submitDraftProject,
  withdrawProject,
  getStudentDeadlines,
} from '../../services/projectService';
import { sendInvitation, getLeaderInvitations } from '../../services/invitationService';
import { formatDate, getStatusBadgeStyle } from '../../utils/formatters';
import {
  Upload,
  FileText,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Mail,
  Send,
  Clock,
  Download,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

export default function SubmitProject() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Project state
  const [project, setProject] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Create project form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineId, setDeadlineId] = useState('');

  // Team invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [leaderInvitations, setLeaderInvitations] = useState([]);

  // File upload states
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadingPpt, setUploadingPpt] = useState(false);
  const [uploadingCode, setUploadingCode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ report: 0, presentation: 0, source: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      // Load deadlines
      const dList = await getStudentDeadlines();
      setDeadlines(dList || []);
      const active = (dList || []).find(d => d.isActive);
      if (active) setDeadlineId(active._id);

      // Check existing projects for student
      const projects = await getProjects();
      if (projects && projects.length > 0) {
        const existingProject = projects[0];
        setProject(existingProject);
        setTitle(existingProject.title);
        setDescription(existingProject.description);
        setDeadlineId(existingProject.deadline?._id || existingProject.deadline || '');

        // Load invitations if leader
        if (existingProject.leader?._id === user?._id || existingProject.leader === user?._id) {
          const invList = await getLeaderInvitations();
          setLeaderInvitations(invList || []);
        }
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
      setFormError('Failed to load submission requirements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle Create Project (DRAFT)
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!title.trim() || !description.trim()) {
      return setFormError('Please enter project title and description');
    }
    if (!deadlineId) {
      return setFormError('No submission deadline is selected');
    }

    setSubmitting(true);
    try {
      const created = await createProject({
        title: title.trim(),
        description: description.trim(),
        deadlineId,
      });
      setProject(created);
      setSuccessMessage('Project created as DRAFT! You can now invite team members and upload deliverables.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Team Member Invitation by registered email
  const handleSendInvitation = async (e) => {
    e.preventDefault();
    if (!project || !inviteEmail.trim()) return;

    setInviting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      await sendInvitation(project._id, inviteEmail.trim());
      setSuccessMessage(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setTimeout(() => setSuccessMessage(null), 4000);

      // Refresh invitations list
      const invList = await getLeaderInvitations();
      setLeaderInvitations(invList || []);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  // Handle File Upload for a specific purpose
  const handleFileUpload = async (e, purpose) => {
    const file = e.target.files[0];
    if (!file || !project) return;

    setFormError(null);
    setSuccessMessage(null);

    // Validate client-side extension before uploading
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = {
      report: ['pdf'],
      presentation: ['ppt', 'pptx'],
      source: ['zip'],
    };

    if (!allowed[purpose].includes(ext)) {
      setFormError(`Invalid file format for ${purpose}. Allowed: .${allowed[purpose].join(', .')}`);
      return;
    }

    if (purpose === 'report') setUploadingReport(true);
    if (purpose === 'presentation') setUploadingPpt(true);
    if (purpose === 'source') setUploadingCode(true);

    try {
      const result = await uploadProjectFile(
        project._id,
        file,
        purpose,
        (percent) => {
          setUploadProgress(prev => ({ ...prev, [purpose]: percent }));
        }
      );

      // Update local project files state
      setProject(prev => {
        const updated = { ...prev };
        if (!updated.files) updated.files = {};
        if (purpose === 'report') {
          updated.files.reportUrl = result.url;
          updated.files.reportHash = result.hash;
          updated.files.reportName = result.originalName;
        } else if (purpose === 'presentation') {
          updated.files.pptUrl = result.url;
          updated.files.pptHash = result.hash;
          updated.files.pptName = result.originalName;
        } else if (purpose === 'source') {
          updated.files.codeZipUrl = result.url;
          updated.files.codeZipHash = result.hash;
          updated.files.codeZipName = result.originalName;
        }
        return updated;
      });

      setSuccessMessage(`${purpose.toUpperCase()} uploaded successfully! (SHA-256: ${result.hash?.substring(0, 16)}...)`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || `Failed to upload ${purpose}`);
    } finally {
      if (purpose === 'report') setUploadingReport(false);
      if (purpose === 'presentation') setUploadingPpt(false);
      if (purpose === 'source') setUploadingCode(false);
    }
  };

  // Handle Final Submission (changes status DRAFT -> SUBMITTED)
  const handleSubmitProject = async () => {
    if (!project) return;
    setFormError(null);
    setSuccessMessage(null);

    // Verify all 3 files exist
    if (!project.files?.reportUrl) {
      return setFormError('Project report (PDF) is required before final submission.');
    }
    if (!project.files?.pptUrl) {
      return setFormError('Presentation slide deck (PPT/PPTX) is required before final submission.');
    }
    if (!project.files?.codeZipUrl) {
      return setFormError('Source code bundle (ZIP) is required before final submission.');
    }

    setSubmitting(true);
    try {
      const submitted = await submitDraftProject(project._id);
      setProject(submitted);
      setSuccessMessage('Project successfully submitted! Plagiarism check has been initiated.');
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit project.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Project Withdrawal
  const handleWithdrawProject = async () => {
    if (!project) return;
    if (!window.confirm('Are you sure you want to withdraw this project submission? This cannot be undone.')) {
      return;
    }

    setSubmitting(true);
    try {
      await withdrawProject(project._id);
      setSuccessMessage('Project has been withdrawn.');
      setProject(prev => ({ ...prev, status: 'withdrawn' }));
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to withdraw project.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLeader = project ? (project.leader?._id === user?._id || project.leader === user?._id) : true;
  const isDraft = project?.status === 'draft';
  const isSubmitted = project && project.status !== 'draft' && project.status !== 'withdrawn';
  const isWithdrawn = project?.status === 'withdrawn';
  const hasAllFiles = project?.files?.reportUrl && project.files?.pptUrl && project.files?.codeZipUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Submission Portal</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {project
              ? `Manage deliverables and team for: "${project.title}"`
              : 'Create a new capstone project draft and configure submission details.'}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3 items-center">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Case 1: No project yet -> Create Project Form (Step 1) */}
      {!project && (
        <form onSubmit={handleCreateProject} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-base">Step 1: Create Project Draft</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                  DRAFT Initializer
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Capstone Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. Deep Learning for Medical Imaging Classification"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description / Problem Statement
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Summarize project scope, objectives, dataset, and implementation methodology..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Submission Deadline / Cohort
                </label>
                <select
                  value={deadlineId}
                  onChange={(e) => setDeadlineId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/60 text-sm focus:outline-none"
                  required
                >
                  <option value="">Select an active deadline</option>
                  {deadlines.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.title} ({d.batch}) — Ends: {new Date(d.submissionEndDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Project & Continue
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">Submission Flow</h4>
              <ul className="space-y-3 text-xs text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>Create draft project. You automatically become the Project Leader.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>Invite team members by registered email address.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <span>Upload PDF Report, PPT Slides, and Source ZIP.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                  <span>Run plagiarism verification and submit before deadline cutoff.</span>
                </li>
              </ul>
            </div>
          </div>
        </form>
      )}

      {/* Case 2: Project exists -> Manage deliverables, team invitations, and submit */}
      {project && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Status and Overview Card */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadgeStyle(project.status)}`}>
                    {project.status.toUpperCase().replace('_', ' ')}
                  </span>
                  <h2 className="text-xl font-bold mt-2">{project.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{project.description}</p>
                </div>
                {isDraft && isLeader && (
                  <button
                    onClick={handleWithdrawProject}
                    disabled={submitting}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    Withdraw Project
                  </button>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Project Leader</p>
                  <p className="font-semibold text-white mt-0.5">{project.leader?.name || user?.name} (You)</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Cohort</p>
                  <p className="font-semibold text-white mt-0.5">{project.cohort || project.deadline?.batch || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Plagiarism Status</p>
                  <p className="font-semibold text-white mt-0.5">
                    {project.status === 'draft' ? 'Pending Final Submission' : `${project.plagiarismScore || 0}% Similarity`}
                  </p>
                </div>
              </div>
            </div>

            {/* Deliverables Section (File Uploads) */}
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-base font-bold">Project Deliverables</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Exactly three logical deliverables are required for final submission.
                </p>
              </div>

              {/* Deliverable 1: Report (PDF) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/30 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">1. Project Report (PDF)</p>
                      <p className="text-xs text-slate-400">Formal SRS, architecture, and evaluation results (.pdf)</p>
                    </div>
                  </div>
                  {project.files?.reportUrl ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>

                {project.files?.reportUrl && (
                  <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-mono text-slate-300 truncate max-w-xs">{project.files.reportName || 'report.pdf'}</span>
                    <a
                      href={project.files.reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> View / Download
                    </a>
                  </div>
                )}

                {isDraft && isLeader && (
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingReport ? 'Uploading...' : project.files?.reportUrl ? 'Replace Report (PDF)' : 'Upload Report (PDF)'}
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileUpload(e, 'report')}
                        disabled={uploadingReport}
                        className="hidden"
                      />
                    </label>
                    {uploadingReport && (
                      <span className="text-xs text-blue-400 font-mono">
                        {uploadProgress.report}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Deliverable 2: Presentation Slides (PPT/PPTX) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/30 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">2. Presentation Slides (PPT / PPTX)</p>
                      <p className="text-xs text-slate-400">Defense presentation slide deck (.ppt, .pptx)</p>
                    </div>
                  </div>
                  {project.files?.pptUrl ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>

                {project.files?.pptUrl && (
                  <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-mono text-slate-300 truncate max-w-xs">{project.files.pptName || 'presentation.pptx'}</span>
                    <a
                      href={project.files.pptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> View / Download
                    </a>
                  </div>
                )}

                {isDraft && isLeader && (
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingPpt ? 'Uploading...' : project.files?.pptUrl ? 'Replace Slides (PPT/PPTX)' : 'Upload Slides (PPT/PPTX)'}
                      <input
                        type="file"
                        accept=".ppt,.pptx"
                        onChange={(e) => handleFileUpload(e, 'presentation')}
                        disabled={uploadingPpt}
                        className="hidden"
                      />
                    </label>
                    {uploadingPpt && (
                      <span className="text-xs text-indigo-400 font-mono">
                        {uploadProgress.presentation}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Deliverable 3: Source Code (ZIP) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/30 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">3. Source Code Archive (ZIP)</p>
                      <p className="text-xs text-slate-400">Complete codebase bundled as compressed archive (.zip)</p>
                    </div>
                  </div>
                  {project.files?.codeZipUrl ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>

                {project.files?.codeZipUrl && (
                  <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-mono text-slate-300 truncate max-w-xs">{project.files.codeZipName || 'source.zip'}</span>
                    <a
                      href={project.files.codeZipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> View / Download
                    </a>
                  </div>
                )}

                {isDraft && isLeader && (
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingCode ? 'Uploading...' : project.files?.codeZipUrl ? 'Replace Source (ZIP)' : 'Upload Source (ZIP)'}
                      <input
                        type="file"
                        accept=".zip"
                        onChange={(e) => handleFileUpload(e, 'source')}
                        disabled={uploadingCode}
                        className="hidden"
                      />
                    </label>
                    {uploadingCode && (
                      <span className="text-xs text-purple-400 font-mono">
                        {uploadProgress.source}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Final Action */}
              {isDraft && isLeader && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {hasAllFiles
                      ? 'All deliverables uploaded. Ready for final evaluation submission.'
                      : 'Upload all three required files to enable project submission.'}
                  </p>
                  <button
                    onClick={handleSubmitProject}
                    disabled={submitting || !hasAllFiles}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Project for Review
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Team Management */}
          <div className="lg:col-span-4 space-y-6">
            {/* Team Members Card */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Project Team</h3>

              {/* Leader */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  L
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{project.leader?.name || user?.name}</p>
                  <p className="text-[10px] text-blue-400 uppercase font-bold">Team Leader</p>
                </div>
              </div>

              {/* Accepted Members */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accepted Members</p>
                {project.teamMembers?.filter(m => (m._id || m) !== (project.leader?._id || project.leader)).length > 0 ? (
                  project.teamMembers
                    .filter(m => (m._id || m) !== (project.leader?._id || project.leader))
                    .map(m => (
                      <div key={m._id || m} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{m.name || 'Student Member'}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No additional team members yet.</p>
                )}
              </div>

              {/* Invite Team Member Form (Leader only, DRAFT only) */}
              {isDraft && isLeader && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Invite Team Member</p>
                  <form onSubmit={handleSendInvitation} className="space-y-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Student's registered email"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Invitation
                    </button>
                  </form>
                </div>
              )}

              {/* Pending Invitations list */}
              {leaderInvitations.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Invitations</p>
                  {leaderInvitations.map(inv => (
                    <div key={inv._id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-300">{inv.invitedUser?.name || inv.email}</p>
                        <p className="text-[10px] text-slate-500">{inv.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        inv.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                        inv.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
