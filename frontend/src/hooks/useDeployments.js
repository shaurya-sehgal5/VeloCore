import { useState, useEffect, useCallback } from 'react';
import { DASH_BASE } from '../config';

export default function useDeployments() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch(`${DASH_BASE}/analytics-list`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setDeployments(await res.json());
      setError(null);
    } catch (err) {
      console.error('[Deployments Fetch Error]:', err.message);
      setError('Failed to load deployed projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 5000);
    return () => clearInterval(interval);
  }, [fetchDeployments]);

  const deleteDeployment = useCallback(async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${DASH_BASE}/deployment/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setDeployments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('[Delete Deployment Error]:', err.message);
      alert('Failed to delete this application. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }, []);

  return { deployments, loading, error, deletingId, fetchDeployments, deleteDeployment };
}
