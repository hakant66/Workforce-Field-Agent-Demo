import { useState, useEffect, useRef, useCallback } from "react";

interface UseWakeWordOptions {
  wakeWord?: string;
  onWakeWord: () => void;
  enabled?: boolean;
  disabled?: boolean; // externally disabled (e.g. during recording)
}

export function useWakeWord({
  wakeWord = "hi neo",
  onWakeWord,
  enabled: initialEnabled = true,
  disabled = false,
}: UseWakeWordOptions) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onWakeWordRef = useRef(onWakeWord);
  onWakeWordRef.current = onWakeWord;

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (transcript.includes(wakeWord)) {
          console.log(`[WakeWord] Detected: "${transcript}"`);
          onWakeWordRef.current();
          // Restart to clear buffer
          recognition.stop();
          return;
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      recognitionRef.current = null;
      setListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        console.warn("[WakeWord] Microphone permission denied");
        setEnabled(false);
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("[WakeWord] Error:", event.error);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, [isSupported, wakeWord]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
    }
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  // Start/stop based on enabled state and disabled prop
  useEffect(() => {
    if (enabled && !disabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, disabled, startListening, stopListening]);

  // Auto-restart when recognition ends (for continuous listening)
  useEffect(() => {
    if (!listening && enabled && !disabled) {
      const timer = setTimeout(startListening, 500);
      return () => clearTimeout(timer);
    }
  }, [listening, enabled, disabled, startListening]);

  return { enabled, listening, toggleEnabled, isSupported };
}
