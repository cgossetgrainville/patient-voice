"use client";

import { useState, useRef } from "react";
import "@/styles/AudioRecorder.css";
import "@/styles/homepage.css";
import { useRecorder } from "../hooks/useRecorder";
import { useUploader } from "../hooks/useUploader";
import { saveSatisfaction } from "../services/transcriptionService";
import Image from "next/image";
const o = "/images/o.png";


interface AudioRecorderProps {
  patientName: string;
}

export default function AudioRecorder({ patientName }: AudioRecorderProps) {
  // Initialisation des états locaux
  const [transcription, setTranscription] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [isGeneratingTable, setIsGeneratingTable] = useState(false);
  const [selectedLangue, setSelectedLangue] = useState("fr");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Utilisation des hooks personnalisés pour l'enregistrement et l'upload
  const { isRecording, startRecording, stopRecording } = useRecorder(setTranscription, patientName, selectedLangue);
  const { handleFileUpload, isLoading, duration } = useUploader(setTranscription, setAudioDuration);

  // Fonction de sauvegarde des données (appel API /api/save)
  const handleSave = async (cleanData: any, tableData: any) => {
    console.log("➡️ Lancement de handleSave");
    const [prenomPart, nomPart] = patientName.split("-").map((s) => s.trim());

  // Alerte si le nom et prenom du patient n'ont pas été entrés
    if (
      !prenomPart || !nomPart ||
      prenomPart.trim().length === 0 || nomPart.trim().length === 0 ||
      prenomPart.toLowerCase().includes("inconnu") ||
      nomPart.toLowerCase().includes("inconnu")
    ) {
      alert("Veuillez renseigner un prénom et un nom valides pour le patient avant de sauvegarder.");
      return;
    }
    if (isEditing) {
      setTranscription(editedText);
      setIsEditing(false);
    }

    const data = await saveSatisfaction({
      patientName,
      audioDuration,
      transcription,
      commentaire,
      cleanData,
      tableData,
    });

    if (data.success) {
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

  // Rendu de l'interface utilisateur

  //?=============?//
  //?   H T M L   ?//
  //?=============?//
  
  return (
    <div>
      {/* Sélecteur de langue */}
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
      {/* Bloc d'enregistrement audio (play / stop) */}
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

      {/* Upload d'un fichier audio */}
      <div style={{ marginTop: isRecording ? "100px" : "40px" }} className="upload-label-wrapper">
        <label className="upload-label">
          <input
            type="file"
            accept=".mp3, .wav, .m4a, .txt, .docx"
            onChange={(e) => handleFileUpload(e, patientName, selectedLangue)}
            className="upload-input"
          />
        </label>
      </div>

      {/* Indicateur de chargement (transcription) */}
      {isLoading && (
        <div className="loader">
          <div className="loader-spinner"></div>
          <span>
            Transcription en cours... {duration !== null && `- ${duration.toFixed(1)} sec`}
          </span>
        </div>
      )}

      {/* Affichage de la transcription */}
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
      {/* Zone de commentaire */}
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
          
          {/* Boutons de suppression et de sauvegarde */}
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
                const [prenomPart, nomPart] = patientName.split("-").map((s) => s.trim());
                if (
                  !prenomPart || !nomPart ||
                  prenomPart.toLowerCase() === "prénom inconnu" ||
                  nomPart.toLowerCase() === "nom inconnu"
                ) {
                  alert("Veuillez renseigner à la fois le prénom et le nom du patient avant de sauvegarder.");
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
                setIsGeneratingTable(false);
              }}
              className="btn-pdf"
            >
              {isGeneratingTable ? "Sauvegarde en cours..." : "Sauvegarder"}
            </button>
          </div>
          {isGeneratingTable && (
            <div
              style={{
                position: "fixed",
                top: "50%-100px",
                left: "50%",
                transform: "translate(calc(-50% + 5rem), -50%)",
                zIndex: 9999,
                padding: "2rem",
                borderRadius: "1rem",
              }}
            >
              <div className="loading-spinner-wrapper">
                <Image
                  src={o}
                  alt="Chargement..."
                  className="rotating-spinner"
                  width={384}
                  height={384}
                  unoptimized
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </div>
  );
}