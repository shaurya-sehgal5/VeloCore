import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { STATUS_META } from "../statusMeta";


const MAX_LOGS = 2000;

const LOG_FLUSH_INTERVAL_MS = 80;

export default function useLiveLogs(onStatusChange) {
  const [activeDeploymentId, setActiveDeploymentId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("IDLE");

  const socketRef = useRef(null);

  // Buffer for incoming log lines between flushes.
  const pendingLogsRef = useRef([]);
  const flushTimerRef = useRef(null);

  const flushPendingLogs = useCallback(() => {
    flushTimerRef.current = null;
    if (pendingLogsRef.current.length === 0) return;

    const batch = pendingLogsRef.current;
    pendingLogsRef.current = [];

    setLogs((prev) => {
      const next = prev.length ? prev.concat(batch) : batch;
      return next.length > MAX_LOGS
        ? next.slice(next.length - MAX_LOGS)
        : next;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(
      flushPendingLogs,
      LOG_FLUSH_INTERVAL_MS
    );
  }, [flushPendingLogs]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "📡 Live log socket connected:",
        socket.id
      );

      if (activeDeploymentId) {
        console.log(
          "🔗 Joining deployment:",
          activeDeploymentId
        );

        socket.emit(
          "join-deployment-stream",
          activeDeploymentId
        );
      }
    });

    socket.on("deployment_created", (deployment) => {
      if (!deployment?.deploymentId) return;

      console.log(
        "🚀 Auto deployment created:",
        deployment.deploymentId
      );

      // Drop anything not yet flushed for the previous deployment.
      pendingLogsRef.current = [];
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      setLogs([]);
      setStatus(deployment.status || "QUEUED");
      setActiveDeploymentId(deployment.deploymentId);
    });

    socket.on("live_logs", (payload) => {
      if (!payload) return;

      console.log("📥 LIVE LOG:", payload);

      pendingLogsRef.current.push({
        timestamp: payload.timestamp,
        level: payload.level,
        stage: payload.stage,
        message: payload.message,
        detailed: payload.detailed || false,
      });
      scheduleFlush();
    });

    socket.on("status_update", (data) => {
      if (!data) return;

      setStatus(data.status);

      onStatusChange?.();

      if (STATUS_META[data.status]?.terminal) {
        socket.disconnect();
      }
    });

    socket.on("deployment_context_changed", (data) => {
      if (!data) return;

      if (
        data.failedDeploymentId === activeDeploymentId &&
        data.activeDeploymentId
      ) {
        setActiveDeploymentId(data.activeDeploymentId);
        setStatus("SUCCESS");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        "🔌 Live log socket disconnected:",
        reason
      );
    });

    socket.on("connect_error", (error) => {
      console.error(
        "❌ Live log socket error:",
        error.message
      );
    });

    return () => {
      socket.off("connect");
      socket.off("deployment_created");
      socket.off("live_logs");
      socket.off("status_update");
      socket.off("disconnect");
      socket.off("connect_error");

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingLogsRef.current = [];
    };
  }, [onStatusChange]);


  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !activeDeploymentId) {
      return;
    }

    const joinDeployment = () => {
      console.log(
        "🔗 Joining active deployment:",
        activeDeploymentId
      );

      socket.emit(
        "join-deployment-stream",
        activeDeploymentId
      );
    };

    if (socket.connected) {
      joinDeployment();
    } else {
      socket.once("connect", joinDeployment);
    }

    return () => {
      socket.off("connect", joinDeployment);
    };
  }, [activeDeploymentId]);

  const startWatching = (
    deploymentId,
    initialStatus = "QUEUED"
  ) => {
    if (!deploymentId) return;

    console.log(
      "👀 Watching deployment:",
      deploymentId
    );

    pendingLogsRef.current = [];
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

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