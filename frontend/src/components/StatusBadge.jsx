const STYLES = {
  active: 'bg-signal/10 text-signal',
  paused: 'bg-token/20 text-[#8A5A0C]',
  suspended: 'bg-danger/10 text-danger',
  scheduled: 'bg-clinical/10 text-clinical',
  in_progress: 'bg-signal/10 text-signal',
  completed: 'bg-slate-200 text-slate-soft',
  cancelled: 'bg-danger/10 text-danger',
  rescheduled: 'bg-token/20 text-[#8A5A0C]',
};

const LABELS = {
  in_progress: 'In Progress',
};

export default function StatusBadge({ status }) {
  const label = LABELS[status] || (status ? status[0].toUpperCase() + status.slice(1) : 'Unknown');
  return <span className={`badge ${STYLES[status] || 'bg-slate-200 text-slate-soft'}`}>{label}</span>;
}
