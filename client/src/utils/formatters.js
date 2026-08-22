export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    case 'submitted':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'under_review':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'evaluated':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};
