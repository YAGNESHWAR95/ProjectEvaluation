import React, { useEffect, useState } from 'react';
import { getUsers, createUser } from '../../services/adminService';
import { getPasswordError } from '../../utils/validators';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('faculty');
  const [department, setDepartment] = useState('Computer Science');
  const [rollNumber, setRollNumber] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Filter
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsersList = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch user directory:', err);
      setError('Unable to load users registry list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError(null);

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = { name, email, password, role, department };
      if (role === 'student') payload.rollNumber = rollNumber;
      if (role === 'faculty') payload.facultyId = facultyId;

      await createUser(payload);
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setRollNumber('');
      setFacultyId('');
      setFormOpen(false);
      
      // Refresh list
      fetchUsersList();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = roleFilter
    ? users.filter(u => u.role === roleFilter)
    : users;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage System Accounts</h1>
          <p className="text-[var(--text-secondary)] text-sm">Add university evaluators or student batches manually.</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* User creation form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreateUser} className="w-full max-w-md glass-panel-glow p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <h3 className="text-base font-bold">Register New Account</h3>

            {formError && (
              <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex gap-2 items-center">
                <AlertCircle className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-white focus:outline-none"
                placeholder="Full Name"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-white focus:outline-none"
                placeholder="university@email.edu"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Role Type</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white focus:outline-none"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Tech</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                </select>
              </div>
            </div>

            {role === 'student' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-white focus:outline-none"
                  placeholder="CS2026-081"
                  required
                />
              </div>
            )}

            {role === 'faculty' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Faculty ID</label>
                <input
                  type="text"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-white focus:outline-none"
                  placeholder="FAC-501"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Login Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-white focus:outline-none"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer text-slate-400 hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role filter bar */}
      <div className="glass-panel p-4 rounded-2xl flex gap-2">
        {['', 'student', 'faculty', 'admin'].map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === r
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                : 'bg-slate-900/40 border border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {r === '' ? 'ALL ACCOUNTS' : r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-slate-800/40 rounded-xl"></div>
          <div className="h-12 bg-slate-800/40 rounded-xl"></div>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-900">
                <tr>
                  <th className="px-6 py-4">Account Holder</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Identifier ID</th>
                  <th className="px-6 py-4">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-900">
                {filteredUsers.map(u => (
                  <tr key={u._id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center font-bold text-xs text-blue-500">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{u.email}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : u.role === 'faculty'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                      {u.role === 'student' ? u.rollNumber : u.role === 'faculty' ? u.facultyId : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{u.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 text-center text-slate-400">No matching user accounts discovered.</div>
      )}
    </div>
  );
}
