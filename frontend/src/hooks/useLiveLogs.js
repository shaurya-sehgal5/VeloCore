import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { STATUS_META } from '../statusMeta';

export default function useLiveLogs(onStatusChange) {
  const [activeDeploymentId, setActiveDeploymentId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('IDLE');

  useEffect(() => {
    if (!activeDeploymentId) return;
    const socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });

    socket.on('connect', () => socket.emit('join-deployment-stream', activeDeploymentId));

    // Keep appending every log line regardless of phase, so build logs flow
    // straight into runtime logs once the app reaches RUNNING.
    socket.on("live_logs", (payload) => {
      if (!payload) return;

      const line = `[${payload.timestamp}] [${payload.level}] [${payload.stage}] ${payload.message}`;

      setLogs((prev) => [...prev, line]);
    });

    socket.on('status_update', (data) => {
      setStatus(data.status);
      onStatusChange?.();
      if (STATUS_META[data.status]?.terminal) socket.disconnect();
    });

    return () => socket.disconnect();
  }, [activeDeploymentId, onStatusChange]);

  const startWatching = (deploymentId, initialStatus = 'QUEUED') => {
    setLogs([]);
    setStatus(initialStatus);
    setActiveDeploymentId(deploymentId);
  };

  return { activeDeploymentId, logs, status, startWatching };
}
