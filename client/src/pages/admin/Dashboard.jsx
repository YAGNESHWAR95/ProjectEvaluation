import React, { useEffect, useState } from 'react';
import { getStats, downloadExportReport, getUsers } from '../../services/adminService';
import { getProjects, assignReviewer } from '../../services/projectService';
import { formatDate, getStatusBadgeStyle } from '../../utils/formatters';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Users, Award, FolderGit2, Download, Loader2, UserCheck, Check, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState({});
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [statsData, projectsData, usersData] = await Promise.all([
        getStats(),
        getProjects(),
        getUsers(),
      ]);
      setStats(statsData);
      setProjects(projectsData || []);
      setFacultyList(usersData?.filter(u => u.role === 'faculty') || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to fetch system metrics and project data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAssignReviewer = async (projectId) => {
    const facultyId = selectedFaculty[projectId];
    if (!facultyId) return;

    setAssigningId(projectId);
    setActionSuccess(null);
    try {
      await assignReviewer(projectId, facultyId);
      setActionSuccess(`Reviewer assigned successfully for project!`);
      setTimeout(() => setActionSuccess(null), 3000);
      // Refresh project list & stats
      const [updatedProjects, updatedStats] = await Promise.all([
        getProjects(),
        getStats(),
      ]);
      setProjects(updatedProjects);
      setStats(updatedStats);
    } catch (err) {
      console.error('Failed to assign reviewer:', err);
      alert(err.response?.data?.message || 'Failed to assign reviewer');
    } finally {
      setAssigningId(null);
    }
  };

  const COLORS = ['#eab308', '#a855f7', '#10b981'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const { summary, statusStats, deptStats } = stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 border-blue-500/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Analytics</h1>
          <p className="text-[var(--text-secondary)] text-sm">Monitor submission volumes, grading velocities, and cohort distributions.</p>
        </div>
        <button
          onClick={async () => {
            setExporting(true);
            try {
              await downloadExportReport();
            } catch (err) {
              console.error('Export failed:', err);
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV Report
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex gap-2 items-center">
          <Check className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Students</p>
            <h3 className="text-lg font-black mt-0.5">{summary?.totalStudents || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Faculty Reviewers</p>
            <h3 className="text-lg font-black mt-0.5">{summary?.totalFaculty || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Teams</p>
            <h3 className="text-lg font-black mt-0.5">{summary?.totalProjects || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Global Average Marks</p>
            <h3 className="text-lg font-black mt-0.5">{summary?.averageScore || 0}</h3>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart 1: Project review progress (Pie) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl flex flex-col h-96">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Milestone Review Velocity</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusStats?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)' }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Department-wise submissions volume (Bar) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl flex flex-col h-96">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Submissions by Department</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="department" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)' }} />
                <Bar dataKey="submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Submitted Projects & Reviewer Allocations Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Project Reviewer Allocations</h3>
            <p className="text-xs text-[var(--text-secondary)]">Assign faculty reviewers to student capstone project submissions.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {projects.length} Total Projects
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-900">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-900">
                <tr>
                  <th className="px-6 py-3.5">Project Title</th>
                  <th className="px-6 py-3.5">Team</th>
                  <th className="px-6 py-3.5">Cohort</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Assigned Reviewer</th>
                  <th className="px-6 py-3.5 text-right">Assign Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-900">
                {projects.map((proj) => (
                  <tr key={proj._id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-semibold text-white truncate">{proj.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{proj.description}</p>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {proj.teamMembers?.map(m => (
                          <span key={m._id} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                      {proj.deadline?.batch || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeStyle(proj.status)}`}>
                        {proj.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {proj.assignedFaculty ? (
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          {proj.assignedFaculty.name}
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={selectedFaculty[proj._id] || (proj.assignedFaculty?._id || '')}
                          onChange={(e) => setSelectedFaculty(prev => ({ ...prev, [proj._id]: e.target.value }))}
                          className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white focus:outline-none"
                        >
                          <option value="">Select Faculty</option>
                          {facultyList.map(f => (
                            <option key={f._id} value={f._id}>
                              {f.name} ({f.department})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignReviewer(proj._id)}
                          disabled={assigningId === proj._id || !selectedFaculty[proj._id]}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {assigningId === proj._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Assign'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">No project submissions yet to allocate.</div>
        )}
      </div>
    </div>
  );
}

