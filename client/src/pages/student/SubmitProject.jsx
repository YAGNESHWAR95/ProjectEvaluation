import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitProject, getStudents } from '../../services/projectService';
import { getDeadlines } from '../../services/adminService';
import useFileUpload from '../../hooks/useFileUpload';
import { Upload, FileText, AlertCircle, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

export default function SubmitProject() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [deadlineId, setDeadlineId] = useState('');
  
  const [students, setStudents] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const navigate = useNavigate();

  // Individual file upload handlers
  const reportUpload = useFileUpload();
  const pptUpload = useFileUpload();
  const codeUpload = useFileUpload();

  const [uploadedFiles, setUploadedFiles] = useState({
    report: null, // { url, hash, name }
    ppt: null,
    code: null,
  });

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        // Fetch deadlines
        const dList = await getDeadlines();
        setDeadlines(dList);
        const active = dList.find(d => d.isActive);
        if (active) setDeadlineId(active._id);

        // Fetch students to select team members
        const studList = await getStudents();
        setStudents(studList);
      } catch (err) {
        console.error('Failed to load form details:', err);
        setFormError('Failed to load submission requirements.');
      } finally {
        setLoading(false);
      }
    };
    loadFormOptions();
  }, []);

  const handleFileUpload = async (e, type, uploadHook) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await uploadHook.uploadFile(file);
      setUploadedFiles(prev => ({
        ...prev,
        [type]: result,
      }));
    } catch (err) {
      console.error(`Upload failed for ${type}:`, err);
    }
  };

  const removeUploadedFile = (type, uploadHook) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: null,
    }));
    uploadHook.setProgress(0);
  };

  const handleTeamMemberToggle = (studentId) => {
    setSelectedTeam(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !description.trim()) {
      return setFormError('Please enter project title and description');
    }
    if (!deadlineId) {
      return setFormError('No submission deadline is selected');
    }
    if (!uploadedFiles.report) {
      return setFormError('Academic Report PDF is required');
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        deadlineId,
        teamMembers: selectedTeam,
        files: {
          reportUrl: uploadedFiles.report?.url || '',
          reportHash: uploadedFiles.report?.hash || '',
          pptUrl: uploadedFiles.ppt?.url || '',
          pptHash: uploadedFiles.ppt?.hash || '',
          codeZipUrl: uploadedFiles.code?.url || '',
          codeZipHash: uploadedFiles.code?.hash || '',
        },
      };

      await submitProject(payload);
      navigate('/');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit project team details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Submission Hub</h1>
          <p className="text-[var(--text-secondary)] text-sm">Upload assets directly and configure team attributes.</p>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Details (Left) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-base mb-2">Project Attributes</h3>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Capstone Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Enter project title"
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
                placeholder="Summarize your project goals, scope, and implementation technologies..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Cohort Submission Target
                </label>
                <select
                  value={deadlineId}
                  onChange={(e) => setDeadlineId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/60 text-sm focus:outline-none"
                  required
                >
                  {deadlines.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.title} ({d.batch})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Team Allocations */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-base mb-2">Team Collaboration</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Check team members who worked with you. Compound indexes block duplicates.
            </p>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-900 rounded-xl divide-y divide-slate-200 dark:divide-slate-900">
              {students.length > 0 ? (
                students.map(student => {
                  const isChecked = selectedTeam.includes(student._id);
                  return (
                    <div
                      key={student._id}
                      onClick={() => handleTeamMemberToggle(student._id)}
                      className={`flex items-center justify-between p-3.5 text-sm cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-500/5 hover:bg-blue-500/10'
                          : 'hover:bg-slate-500/5'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{student.rollNumber} | {student.department}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  );
                })
              ) : (
                <p className="p-4 text-xs text-[var(--text-secondary)]">No students found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Drag & Drop File Upload Areas (Right) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="font-bold text-base">Direct Asset Uploads</h3>

            {/* Area 1: Academic Report (PDF) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Project Report (PDF only) <span className="text-red-500">*</span>
              </label>
              
              {uploadedFiles.report ? (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex justify-between items-center">
                  <div className="flex gap-3 items-center min-w-0">
                    <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold truncate">{uploadedFiles.report.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadedFile('report', reportUpload)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, 'report', reportUpload)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={reportUpload.loading}
                  />
                  {reportUpload.loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-xs text-slate-400">Uploading {reportUpload.progress}%</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="w-8 h-8 text-slate-500" />
                      <p className="text-xs font-semibold text-white">Drag & drop or Click to choose PDF</p>
                      <p className="text-[10px] text-slate-500">Max size: 100MB</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Area 2: Slide Presentation (PPT) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Slides / Presentation (PPT / PPTX)
              </label>

              {uploadedFiles.ppt ? (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex justify-between items-center">
                  <div className="flex gap-3 items-center min-w-0">
                    <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold truncate">{uploadedFiles.ppt.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadedFile('ppt', pptUpload)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".ppt,.pptx"
                    onChange={(e) => handleFileUpload(e, 'ppt', pptUpload)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={pptUpload.loading}
                  />
                  {pptUpload.loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-xs text-slate-400">Uploading {pptUpload.progress}%</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="w-8 h-8 text-slate-500" />
                      <p className="text-xs font-semibold text-white">Drag & drop or Click to choose PPT</p>
                      <p className="text-[10px] text-slate-500">Max size: 100MB</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Area 3: Source Code ZIP Archive */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Source Code Archive (ZIP only)
              </label>

              {uploadedFiles.code ? (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex justify-between items-center">
                  <div className="flex gap-3 items-center min-w-0">
                    <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold truncate">{uploadedFiles.code.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadedFile('code', codeUpload)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => handleFileUpload(e, 'code', codeUpload)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={codeUpload.loading}
                  />
                  {codeUpload.loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-xs text-slate-400">Uploading {codeUpload.progress}%</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="w-8 h-8 text-slate-500" />
                      <p className="text-xs font-semibold text-white">Drag & drop or Click to choose ZIP</p>
                      <p className="text-[10px] text-slate-500">Max size: 100MB</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Team Entry...</span>
                </>
              ) : (
                'Finalize Submission'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
