export const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const objectToRows = (obj) => Object.entries(obj || {}).map(([key, value]) => ({ id: genId(), key, value: String(value) }));

export const rowsToObject = (rows) =>
  rows.reduce((acc, r) => {
    if (r.key.trim()) acc[r.key.trim()] = r.value;
    return acc;
  }, {});

const FRAMEWORK_LABELS = {
  express: 'Express',
  fastify: 'Fastify',
  'vite-react': 'Vite React',
  nextjs: 'Next.js',
  bullmq: 'BullMQ',
  django: 'Django',
  flask: 'Flask',
};

export const formatFramework = (fw) =>
  FRAMEWORK_LABELS[fw] || (fw ? fw.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');
