import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../../services/projectService';
import { getEvaluationsByProject } from '../../services/evaluationService';
import { getDeadlines } from '../../services/adminService';
import { formatDate, getStatusBadgeStyle } from '../../utils/formatters';
import { FileText, Award, Layers, Users, Clock, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StudentDashboard() {
  const [project, setProject] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects where student is a member
        const projects = await getProjects();
        if (projects && projects.length > 0) {
          const currentProject = projects[0];
          setProject(currentProject);
          
          // Fetch evaluations for this project
          const evals = await getEvaluationsByProject(currentProject._id);
          setEvaluations(evals);
        }

        // Fetch active deadlines
        const deadlines = await getDeadlines();
        if (deadlines && deadlines.length > 0) {
          const active = deadlines.find(d => d.isActive);
          setDeadline(active);
        }
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
        setError('Unable to load dashboard details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-800/50 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-slate-800/50 rounded-2xl md:col-span-2"></div>
          <div className="h-48 bg-slate-800/50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Calculate countdown
  const getCountdownString = () => {
    if (!deadline) return 'No active deadlines';
    const diff = new Date(deadline.submissionEndDate) - new Date();
    if (diff < 0) return 'Deadline Closed';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
  };

  const isDeadlineClosed = () => {
    if (!deadline) return false;
    return new Date(deadline.submissionEndDate) - new Date() < 0;
  };

  // Determine stage completion
  const getPhaseEvaluation = (phase) => {
    return evaluations.find(e => e.phase === phase);
  };

  const getStepStatus = (phase) => {
    const evaluation = getPhaseEvaluation(phase);
    if (evaluation) return 'completed';
    if (!project) return 'pending';
    if (project.status === 'submitted') {
      return phase === 'abstract' ? 'current' : 'pending';
    }
    if (project.status === 'under_review') {
      const abstractEval = getPhaseEvaluation('abstract');
      if (!abstractEval) return 'current';
      return phase === 'midterm' ? 'current' : 'pending';
    }
    return 'pending';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-blue-500/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Track and submit your academic capstone projects.
          </p>
        </div>
        {!project && (
          <Link
            to="/submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            Submit New Project
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left main section */}
        <div className="lg:col-span-8 space-y-8">
          {project ? (
            <>
              {/* Project Card */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadgeStyle(project.status)}`}>
                      {project.status.toUpperCase().replace('_', ' ')}
                    </span>
                    <h2 className="text-xl font-bold mt-2">{project.title}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{project.description}</p>
                  </div>
                  {project.plagiarismScore > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Plagiarism Score</span>
                      <p className={`text-lg font-bold ${project.plagiarismScore > 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {project.plagiarismScore}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-900 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Team Size</p>
                      <p className="text-xs font-semibold">{project.teamMembers?.length || 0} Members</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Submitted Date</p>
                      <p className="text-xs font-semibold">{formatDate(project.submittedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Assigned Evaluator</p>
                      <p className="text-xs font-semibold">
                        {project.assignedFaculty ? project.assignedFaculty.name : 'Awaiting Reviewer'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Stepper Visualizer */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-500" />
                  Evaluation Milestone Tracker
                </h3>

                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  {/* Phase 1: Abstract */}
                  <div className="flex-1 flex gap-4 sm:flex-col sm:items-center text-left sm:text-center relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      getStepStatus('abstract') === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500'
                        : getStepStatus('abstract') === 'current'
                        ? 'bg-blue-500/10 text-blue-500 border-2 border-blue-500 animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {getStepStatus('abstract') === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Phase 1: Abstract Approval</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">SRS & Problem Scope</p>
                      {getPhaseEvaluation('abstract') && (
                        <p className="text-xs font-bold text-emerald-500 mt-1">
                          Marks: {getPhaseEvaluation('abstract').totalScore}/30
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phase 2: Midterm */}
                  <div className="flex-1 flex gap-4 sm:flex-col sm:items-center text-left sm:text-center relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      getStepStatus('midterm') === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500'
                        : getStepStatus('midterm') === 'current'
                        ? 'bg-blue-500/10 text-blue-500 border-2 border-blue-500 animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {getStepStatus('midterm') === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Phase 2: Midterm Demo</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Architecture & DB Setup</p>
                      {getPhaseEvaluation('midterm') && (
                        <p className="text-xs font-bold text-emerald-500 mt-1">
                          Marks: {getPhaseEvaluation('midterm').totalScore}/40
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phase 3: Final */}
                  <div className="flex-1 flex gap-4 sm:flex-col sm:items-center text-left sm:text-center relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      getStepStatus('final') === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500'
                        : getStepStatus('final') === 'current'
                        ? 'bg-blue-500/10 text-blue-500 border-2 border-blue-500 animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {getStepStatus('final') === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : '3'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Phase 3: Final Viva</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Code Presentation & Q&A</p>
                      {getPhaseEvaluation('final') && (
                        <p className="text-xs font-bold text-emerald-500 mt-1">
                          Marks: {getPhaseEvaluation('final').totalScore}/60
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rubric Marksheets detail cards */}
              {evaluations.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Published Milestone Grades
                  </h3>
                  
                  {evaluations.map(e => (
                    <div key={e._id} className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md border border-blue-500/20">
                          {e.phase.toUpperCase()} EVALUATION
                        </span>
                        <div className="text-right">
                          <span className="text-xs text-[var(--text-secondary)]">Total Milestone Grade: </span>
                          <span className="font-extrabold text-blue-500">{e.totalScore}</span>
                        </div>
                      </div>

                      {/* Criteria Score Blocks */}
                      <div className="space-y-3 mb-4">
                        {e.scores.map((sc, idx) => {
                          const percentage = (sc.scoredMarks / sc.maxMarks) * 100;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>{sc.criteriaName}</span>
                                <span>{sc.scoredMarks} / {sc.maxMarks}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {e.feedback && (
                        <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-[var(--text-secondary)]">
                          <strong className="text-white block mb-1">Evaluator Comments:</strong>
                          "{e.feedback}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">No Active Submissions Found</h3>
              <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">
                You have not uploaded your team's graduation capstone project yet. Create a submission before the closing lock!
              </p>
              <div className="pt-2">
                <Link
                  to="/submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Create Submission
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right timeline info column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Deadline Countdown widget */}
          <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border-indigo-500/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Closing Countdown
            </h3>

            {deadline ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-white text-lg">{deadline.title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Cohort Target: {deadline.batch}</p>
                </div>

                <div className={`p-4 rounded-xl text-center border ${
                  isDeadlineClosed()
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 animate-glow'
                }`}>
                  <p className="text-xs uppercase font-bold tracking-wider opacity-70">Submission Time Window</p>
                  <p className="text-2xl font-black mt-1.5 tracking-tight font-mono">{getCountdownString()}</p>
                </div>

                <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span>Window Opens:</span>
                    <span className="font-semibold text-white">{new Date(deadline.submissionStartDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submission Cutoff:</span>
                    <span className="font-semibold text-white">{new Date(deadline.submissionEndDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm py-4">
                No active timelines scheduled currently.
              </div>
            )}
          </div>

          {/* Submission Guidelines */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">Submission Checklist</h4>
            <ul className="space-y-3 text-xs text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Upload PDF document describing project Abstract/SRS scoping parameters.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Submit final slide presentation file (.ppt / .pptx) for review.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Bundle project source codes inside a compressed archive (.zip) file.</span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>System triggers SHA-256 duplicate scans and copy checks instantly.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
