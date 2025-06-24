import path from "path";
import os from "os";
// Hook pour gérer l'envoi d'un fichier audio et lancer la transcription
import { useState } from "react";

export function useUploader(setTranscription: (text: string) => void, setAudioDuration: (duration: number) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    patientName: string,
    selectedLangue: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = path.extname(file.name).toLowerCase();
    const isAudio = [".mp3", ".wav", ".m4a"].includes(ext);

    if (isAudio) {
      // Calcule la durée de l’audio sélectionné
      const audioUrl = URL.createObjectURL(file);
      const audioElement = new Audio(audioUrl);
      await new Promise<void>((resolve) => {
        audioElement.addEventListener("loadedmetadata", () => {
          setAudioDuration(audioElement.duration);
          resolve();
        });
      });
    }

    // Lance le timer (pour les fichiers audio uniquement)
    setIsLoading(true);
    setDuration(0);
    const interval = setInterval(() => {
      setDuration((prev) => (prev !== null ? prev + 0.1 : 0));
    }, 100);

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("patientName", patientName);
    formData.append("langue", selectedLangue);

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.text) {
      setTranscription(data.text);
    } else {
      setTranscription("Aucune transcription reçue.");
    }

    clearInterval(interval);
    setIsLoading(false);
  };

  return { handleFileUpload, isLoading, duration };
}
