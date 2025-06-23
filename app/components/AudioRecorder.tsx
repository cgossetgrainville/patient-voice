"use client";

import { useState, useRef, useEffect } from "react";
import "./AudioRecorder.css";
import "../homepage.css";

interface AudioRecorderProps {
  patientName: string;
}

export default function AudioRecorder({ patientName }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcription, setTranscription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [isGeneratingTable, setIsGeneratingTable] = useState(false);
  const [selectedLangue, setSelectedLangue] = useState("fr");
  const containerRef = useRef<HTMLDivElement | null>(null);

  
  const startRecording = async () => {
    try {
      // Start browser media recording for API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const visualEls = [
        document.querySelector(".record-smoke-bg"),
        document.querySelector(".record-smoke-bg.secondary"),
      ];

      function animate() {
        requestAnimationFrame(animate);
        analyser.getByteTimeDomainData(dataArray);

        const rms = Math.sqrt(dataArray.reduce((sum, v) => {
          const val = v - 128;
          return sum + val * val;
        }, 0) / dataArray.length);

        const scale = 1 + rms / 20;
        const opacity = Math.min(1, 0.5 + rms / 50);

        visualEls.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.transform = `translate(-50%, -50%) scale(${scale})`;
            el.style.opacity = `${opacity}`;
          }
        });
      }
      animate();

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
        setTranscription(data.text);
      };

      recorder.onstop = () => {
        setIsRecording(false);
      };
    } catch (err) {
      console.error("Erreur micro :", err);
      alert("Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
  };

  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Calculer de la durée du fichier audio 
    const audioUrl = URL.createObjectURL(file);
    const audioElement = new Audio(audioUrl);
    await new Promise<void>((resolve) => {
      audioElement.addEventListener("loadedmetadata", () => {
        setAudioDuration(audioElement.duration);
        console.log("Durée du fichier audio :", audioElement.duration, "secondes");
        resolve();
      });
    });

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
    setTranscription(data.text);
    clearInterval(interval);
    setIsLoading(false);
  };

  const handleSave = async (cleanData: any, tableData: any) => {
    console.log("➡️ Lancement de handleSave");
    if (!patientName || !patientName.includes("-")) {
      alert("Veuillez renseigner le prénom et le nom du patient (format : prénom-nom).");
      return;
    }
    if (isEditing) {
      setTranscription(editedText);
      setIsEditing(false);
    }
    const [prenomPart, nomPart] = patientName.split("-").map((s) => s.trim());

    const res = await fetch("/api/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nom: nomPart || "Nom inconnu",
        prenom: prenomPart || "Prénom inconnu",
        duree: audioDuration,
        transcription,
        commentaire_pro: commentaire,
        transcription_corrigee: cleanData.text,
        pdf_transcription: cleanData.pdfPath,
        pdf_tableau: tableData.pdfPath,
        tableau: cleanData.csv,
      }),
    });

    const data = await res.json();
    console.log("✅ Résultat de /api/save :", data);
    if (data.success) {
      console.log("🎯 Enregistrement en base réussi");
      alert("Enquete de Satisfaction enregistrée ✅");
      setCommentaire("");
      setTranscription("");
      setAudioDuration(null);
      const fileInput = document.querySelector(".upload-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      const nameInput = document.getElementById("patientName") as HTMLInputElement;
      if (nameInput) nameInput.value = "";
    } else {
      alert("Erreur lors de l'enregistrement ❌");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem" }} htmlFor="lang-select">Langue :</label>
        <select
          id="langue-select"
          value={selectedLangue}
          onChange={(e) => setSelectedLangue(e.target.value)}
        >
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
          <option value="es">Espagnol</option>
        </select>
      </div>
      <div className="recorder-wrapper">
      {!isRecording ? (
        <img
          src="/play.png"
          alt="Démarrer l'enregistrement"
          onClick={startRecording}
          className="start-record-btn"
          style={{ width: 180, cursor: "pointer" }}
        />
      ) : (
        <div style={{ position: "relative", width: "100%", height: "120px" }}>
          <div className="record-smoke-bg" />
          <div className="record-smoke-bg secondary" />
          <div
            ref={containerRef}
            style={{ width: "100%", height: "100px", position: "relative", zIndex: 2 }}
          />
          <img
            src="/stop.png"
            alt="Arrêter l'enregistrement"
            onClick={stopRecording}
            className="stop-record-btn"
            style={{
              position: "absolute",
              top: "calc(50%)",
              left: "calc(50% - 30px)",
              width: 60,
              height: 60,
              cursor: "pointer",
              zIndex: 2,
              marginBottom: "30px",
            }}
          />
        </div>
      )}

      <div style={{ marginTop: isRecording ? "100px" : "40px" }} className="upload-label-wrapper">
        <label className="upload-label">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="upload-input"
          />
        </label>
      </div>

      {isLoading && (
        <div className="loader">
          <div className="loader-spinner"></div>
          <span>
            Transcription en cours... {duration !== null && `- ${duration.toFixed(1)} sec`}
          </span>
        </div>
      )}

      {transcription && (
        <div className="transcription-box">
          <p className="font-semibold mb-2">Transcription :</p>
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="edit-textarea"
            />
          ) : (
            <p className="transcription-text">{transcription}</p>
          )}
        </div>
      )}
      {transcription && (
        <>
          <div className="commentaire-box">
            <label className="font-semibold block">Commentaire du médecin :</label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              className="edit-textarea commentaire-textarea"
            />
          </div>
          
          <div className="action-buttons">
            <button
              onClick={() => {
                setTranscription("");
                setCommentaire("");
                setAudioDuration(null);
                const fileInput = document.querySelector(".upload-input") as HTMLInputElement;
                if (fileInput) fileInput.value = "";
                const nameInput = document.getElementById("patientName") as HTMLInputElement;
                if (nameInput) nameInput.value = "";
              }}
              className="btn-delete"
            >
              Supprimer
            </button>
            
            <button
              onClick={async () => {
                if (!patientName || !patientName.includes("-")) {
                  alert("Veuillez renseigner le prénom et le nom du patient (format : prénom-nom).");
                  return;
                }

                const [prenomPart, nomPart] = patientName.split("-").map((s) => s.trim());
                if (!prenomPart || !nomPart) {
                  alert("Veuillez renseigner à la fois le prénom et le nom du patient.");
                  return;
                }

                setIsGeneratingTable(true);
                const cleanPatientName = `${prenomPart}-${nomPart}`;

                const res = await fetch("/api/save-task", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    transcription,
                    patientName: cleanPatientName,
                  }),
                  keepalive: true,
                });
                const result = await res.json();

                if (result.success) {
                  if (document.visibilityState === "visible") {
                    alert("Enquete de Satisfaction enregistrée ✅");
                  } else if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Enquête de Satisfaction enregistrée ✅");
                  } else if ("Notification" in window && Notification.permission !== "denied") {
                    Notification.requestPermission().then((permission) => {
                      if (permission === "granted") {
                        new Notification("Enquête de Satisfaction enregistrée ✅");
                      }
                    });
                  }
                  setCommentaire("");
                  setTranscription("");
                  setAudioDuration(null);
                  const fileInput = document.querySelector(".upload-input") as HTMLInputElement;
                  if (fileInput) fileInput.value = "";
                  const nameInput = document.getElementById("patientName") as HTMLInputElement;
                  if (nameInput) nameInput.value = "";
                } else {
                  alert("Erreur lors de l'enregistrement ❌");
                }
              }}
              className="btn-pdf"
              disabled={
                isGeneratingTable ||
                !patientName ||
                !patientName.includes("-") ||
                patientName.split("-").some((part) => part.trim() === "")
              }
            >
              {isGeneratingTable ? (
                <>
                  <span className="loader-spinner-inline" /> Sauvegarde en cours...
                </>
              ) : (
                "Sauvegarder"
              )}
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  );
}