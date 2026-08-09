import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { STATUS_META } from "../statusMeta";

export default function useLiveLogs(onStatusChange) {
  const [activeDeploymentId, setActiveDeploymentId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("IDLE");

  const socketRef = useRef(null);

  useEffect(() => {
    if (!activeDeploymentId) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const joinDeployment = () => {
      socket.emit(
        "join-deployment-stream",
        activeDeploymentId
      );
    };

    socket.on("connect", joinDeployment);

    socket.on("live_logs", (payload) => {
      if (!payload) return;

      setLogs((prev) => [
        ...prev,
        {
          timestamp: payload.timestamp,
          level: payload.level,
          stage: payload.stage,
          message: payload.message,
        },
      ]);
    });

    socket.on("status_update", (data) => {
      if (!data) return;

      setStatus(data.status);

      onStatusChange?.();

      if (STATUS_META[data.status]?.terminal) {
        socket.disconnect();
      }
    });

    return () => {
      socket.off("connect", joinDeployment);
      socket.off("live_logs");
      socket.off("status_update");
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [activeDeploymentId, onStatusChange]);

  const startWatching = (
    deploymentId,
    initialStatus = "QUEUED"
  ) => {
    if (!deploymentId) return;

    setLogs([]);
    setStatus(initialStatus);
    setActiveDeploymentId(deploymentId);
  };

  return {
    activeDeploymentId,
    logs,
    status,
    startWatching,
  };
}