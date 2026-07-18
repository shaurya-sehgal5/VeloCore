import { useState, useEffect, useCallback } from 'react';
import { SERVICES_BASE } from '../config';

export default function useDeploymentRuntime(deploymentId, { poll = false } = {}) {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(null);
  const [runtimeEngine, setRuntimeEngine] = useState('docker'); // confirmed default per backend startup logs
  const [metrics, setMetrics] = useState(null); // only populated if your /runtime response includes a metrics object

  const fetchRuntime = useCallback(async () => {
    if (!deploymentId) return;
    try {
      const res = await fetch(`${SERVICES_BASE}/${deploymentId}/runtime`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setServices(data.services || []);
      setRuntimeEngine(data.engine || data.runtime || data.runtimeEngine || 'docker');
      setMetrics(data.metrics || null);
      setServicesError(null);
    } catch (err) {
      console.error('[Runtime Fetch Error]:', err.message);
      setServicesError('Failed to load services.');
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    if (!deploymentId) return;
    setServicesLoading(true);
    fetchRuntime();
    if (!poll) return;
    const interval = setInterval(fetchRuntime, 5000);
    return () => clearInterval(interval);
  }, [deploymentId, poll, fetchRuntime]);

  return { services, servicesLoading, servicesError, runtimeEngine, metrics, refetch: fetchRuntime };
}
