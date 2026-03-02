import { useState, useEffect, useCallback } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  useEffect(() => {
    const goOnline = () => { if (!simulatedOffline) setIsOnline(true); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [simulatedOffline]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        setSimulatedOffline(prev => {
          const next = !prev;
          setIsOnline(!next && navigator.onLine);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return { isOnline: isOnline && !simulatedOffline, simulatedOffline };
}
