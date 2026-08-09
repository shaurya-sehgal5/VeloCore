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

      setLogs([]);
      setStatus(deployment.status || "QUEUED");
      setActiveDeploymentId(deployment.deploymentId);
    });

    socket.on("live_logs", (payload) => {
      if (!payload) return;

      console.log("📥 LIVE LOG:", payload);

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

      console.log(
        "📊 DEPLOYMENT STATUS:",
        data.status
      );

      setStatus(data.status);

      onStatusChange?.();

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