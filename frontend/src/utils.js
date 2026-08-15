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

export function parseEnvFile(text) {
  const result = {};

  if (!text || typeof text !== "string") {
    return result;
  }

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    let line = rawLine.trim();

    // Empty line / comment
    if (!line || line.startsWith("#")) {
      continue;
    }

    // Support:
    // KEY=value
    // export KEY=value
    if (line.startsWith("export ")) {
      line = line.slice(7).trim();
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line
      .slice(0, separatorIndex)
      .trim();

    if (!key) {
      continue;
    }

    let value = line
      .slice(separatorIndex + 1)
      .trim();

    // Remove surrounding quotes
    if (
      value.length >= 2 &&
      (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      )
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}