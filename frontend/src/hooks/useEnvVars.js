import { useState, useEffect, useCallback } from 'react';
import { ENV_BASE } from '../config';
import { genId, objectToRows, rowsToObject } from '../utils';

export default function useEnvVars(deploymentId, { autoLoad = false } = {}) {
  const [rows, setRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!deploymentId) return [];
    setLoading(true);
    try {
      const res = await fetch(`${ENV_BASE}/${deploymentId}`, { credentials: 'include' });
      const data = res.ok ? await res.json() : {};
      const loadedRows = objectToRows(data);
      setRows(loadedRows);
      setOriginalRows(loadedRows);
      setLoaded(true);
      return loadedRows;
    } catch (err) {
      console.error('[Env Fetch Error]:', err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    if (autoLoad && deploymentId && !loaded) load();
  }, [autoLoad, deploymentId, loaded, load]);

  const ensureLoaded = useCallback(async () => (loaded ? rows : load()), [loaded, rows, load]);

  const save = useCallback(
    async (rowsOverride) => {
      const target = rowsOverride || rows;
      setSaving(true);
      try {
        await fetch(`${ENV_BASE}/${deploymentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(rowsToObject(target)),
        });
        setOriginalRows(target);
        setEditing(false);
      } catch (err) {
        console.error('[Env Save Error]:', err.message);
        alert('Failed to save environment variables.');
      } finally {
        setSaving(false);
      }
    },
    [rows, deploymentId]
  );

  const changeRow = (id, field, value) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const addRow = () => setRows((prev) => [...prev, { id: genId(), key: '', value: '' }]);
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));
  const startEdit = () => setEditing(true);
  const cancelEdit = () => {
    setRows(originalRows);
    setEditing(false);
  };

  return { rows, editing, loading, saving, startEdit, cancelEdit, changeRow, addRow, removeRow, save, ensureLoaded };
}
