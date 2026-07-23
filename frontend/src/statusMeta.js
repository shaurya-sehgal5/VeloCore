export const STATUS_META = {
  QUEUED: { fg: '#a1a1aa', bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.3)', busy: true },
  CLONING: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', busy: true },
  SCANNING: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', busy: true },
  BUILDING: { fg: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)', busy: true },
  DEPLOYING: { fg: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)', busy: true },
  RUNNING: { fg: '#3ecf8e', bg: 'rgba(62,207,142,0.12)', border: 'rgba(62,207,142,0.4)', busy: false },
  FAILED: { fg: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.4)', busy: false, terminal: true },
  STOPPED: { fg: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', busy: false, terminal: true },
  IDLE: { fg: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', busy: false },
};

export const getStatusStyle = (status) => STATUS_META[status] || STATUS_META.IDLE;
export const isBusyStatus = (status) => getStatusStyle(status).busy;
