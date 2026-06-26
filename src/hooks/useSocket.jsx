import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const WS_URL =
      import.meta.env.VITE_WS_URL || "http://localhost:5000/syncpad";
    console.log(`Connecting to WebSocket server: ${WS_URL}`);

    const newSocket = io(WS_URL, {
      withCredentials: true,
      transports: ["websocket"], // Force WebSockets only for better performance
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected:", newSocket.id);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
