// Hook pour gérer l'enregistrement audio à partir du micro
import { useState } from "react";

export function useRecorder(setTranscription: (text: string) => void, patientName: string, selectedLangue: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      // Récupère le flux audio du micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Initialise l'enregistrement
      const recorder = new MediaRecorder(stream);
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Envoie l'audio pour transcription
      recorder.ondataavailable = async (e) => {
        const audioBlob = new Blob([e.data], { type: "audio/webm" });
        const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });

        const formData = new FormData();
        formData.append("audio", file);
        formData.append("patientName", patientName);
        formData.append("langue", selectedLangue);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        // Met à jour la transcription
        setTranscription(data.text);
      };

      // Met à jour l'état d'enregistrement
      recorder.onstop = () => setIsRecording(false);
    } catch (err) {
      console.error("Erreur micro :", err);
      alert("Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecording = () => mediaRecorder?.stop();

  return { isRecording, startRecording, stopRecording };
}
