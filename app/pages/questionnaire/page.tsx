// Page Questionnaire
"use client";
import { useState, useRef, useEffect } from "react";
import "../../../styles/AudioRecorder.css";
import "../../../styles/homepage.css";
import "../../../styles/dashboard.css";
import PatientNameForm from "../../../components/PatientNameForm";
import Image from "next/image";
const logo1 = "/images/logo1.png";
const logo2 = "/images/logo2.png";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";


import prompts from "../../../data/prompts.json";

// Liste des questions //! Importées depuis le fichier JSON (sur le s3)
const questions = prompts.questionnaire_questions;

// On concatenne les questions + responses
function concatResponses(
  answers: { index: number; text: string }[],
  writtenAnswers: { index: number; text: string }[]
) {
  let all = [];
  for (let i = 0; i < questions.length; i++) {
    const audioAnswer = answers.find(
      (a) => a.index === i && a.text && a.text.trim() !== ""
    );
    const writtenAnswer = writtenAnswers.find(
      (a) => a.index === i && a.text && a.text.trim() !== ""
    );
    if (audioAnswer) {
      all.push(questions[i]);
      all.push(audioAnswer.text.trim());
    } else if (writtenAnswer) {
      all.push(questions[i]);
      all.push(writtenAnswer.text.trim());
    }
  }
  return all.join("\n");
}

export default function QuestionnairePage() {
  const [index, setIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordings, setRecordings] = useState<{ index: number, blob: Blob }[]>([]);
  const [answers, setAnswers] = useState<{ index: number; text: string }[]>([]);
  const [reponse, setReponse] = useState("");
  const [writtenAnswers, setWrittenAnswers] = useState<{ index: number, text: string }[]>([]);
  const [transcription, setTranscription] = useState("");
  const [isGeneratingTable, setIsGeneratingTable] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const patientName = `${prenom}-${nom}`;
  const [adminInfo, setAdminInfo] = useState<{ prenom: string; nom: string } | null>(null);
  const [selectedLangue, setSelectedLangue] = useState("fr");

  // Met à jour la transcription dès qu'une réponse est ajoutée
  useEffect(() => {
    if (answers.length > 0 || writtenAnswers.length > 0) {
      setTranscription(concatResponses(answers, writtenAnswers));
    }
  }, [answers, writtenAnswers]);
  // Récupère infos de l'admin
  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then(setAdminInfo);
  }, []);

  // Termine l'enregistrement et lance la transcription
  const handleFinish = async (finalRecordings: { index: number, blob: Blob }[], finalWrittenAnswers: { index: number, text: string }[]) => {
    if (finalRecordings.length > 0) {
      setIsTranscribing(true);
      // Transcription de toutes les réponses audio restantes
      const audioAnswers: { index: number, text: string }[] = [];
      for (let i = 0; i < finalRecordings.length; i++) {
        const { index: idx, blob } = finalRecordings[i];
        const formData = new FormData();
        formData.append("audio", blob, `question-${idx + 1}.webm`);
        formData.append("langue", selectedLangue);
        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();
        audioAnswers.push({ index: idx, text: data.text });
      }
      setAnswers(audioAnswers);
      setIsTranscribing(false);
    } else {
      setIsTranscribing(false);
      setAnswers([]); 
    }
  };

  // Lance l'enregistrement audio de la réponse à la question courante
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const newRecordings = [...recordings, { index, blob }];
      setRecordings(newRecordings);
      chunksRef.current = [];
      setIsRecording(false);

      if (index < questions.length - 1) {
        setIndex(index + 1);
      } else {
        setIndex(index + 1);
        handleFinish(newRecordings, writtenAnswers);
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  // Arrête l'enregistrement audio en cours
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  // Transcrit toutes les réponses audio existantes et les stocke
  const exportAllAnswers = async () => {
    const allAnswers: { index: number, text: string }[] = [];

    for (let i = 0; i < recordings.length; i++) {
      const { index: idx, blob } = recordings[i];
      const formData = new FormData();
      formData.append("audio", blob, `question-${idx + 1}.webm`);
      formData.append("langue", selectedLangue);
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      allAnswers.push({ index: idx, text: data.text });
    }

    setAnswers(allAnswers);
  };

  // Sauvegarde l’ensemble des réponses sous forme structurée via l’API
  const handleSave = async () => {
    if (!patientName) {
      alert("Veuillez renseigner le prénom et le nom du patient avant d’enregistrer.");
      return;
    }
    setIsGeneratingTable(true);
    try {
      const fullTranscription = concatResponses(answers, writtenAnswers);

      const res = await fetch("/api/save-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription: fullTranscription,
          patientName: patientName,
        }),
        keepalive: true,
      });
      const result = await res.json();

      if (result.success) {
        alert("Enquête de Satisfaction enregistrée ✅");
        window.location.reload();
        setCommentaire("");
        setTranscription("");
      } else {
        alert("Erreur lors de l'enregistrement ❌");
      }
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + (err?.message || ""));
    } finally {
      setIsGeneratingTable(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <PatientNameForm prenom={prenom} setPrenom={setPrenom} nom={nom} setNom={setNom} />
      {/* Contenu principal – affichage du logo, choix de la langue, questions et réponses */}
      <main className="main-container">
        <div className="homepage-header">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Image src={logo1} alt="Logo Patient Voice" width={440} height={160} />
          </div>
          <p className="homepage-subtitle">Prototypage d’un outil d’écoute patient</p>
        </div>
        <div>
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
          {/* Si n° question < nbtotquestions, question suivante, sinon on affiche le resume */}
          {index < questions.length ? (
            <>
              <p className="upload-label">{questions[index]}</p>
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
              zIndex: 3,
            }}
          />
        </div>
        
      )}
              <div className="commentaire-box" style={{ marginTop: isRecording ? "60px" : "0px" }}>
                <textarea
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  className="transcription-box"
                  rows={3}
                  placeholder="Votre réponse écrite ici"
                  style={{ width: "100%", maxWidth: 500 }}
                />
                <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 20, marginBottom: 80 }}>
                  <button
                    className="btn-pdf"
                    onClick={async () => {
                      if (reponse.trim() !== "") {
                        const nextWrittenAnswers = [...writtenAnswers, { index, text: reponse }];
                        setWrittenAnswers(nextWrittenAnswers);
                        if (index < questions.length - 1) {
                          setIndex(index + 1);
                        } else {
                          setIndex(index + 1);
                          handleFinish(recordings, nextWrittenAnswers);
                        }
                        setReponse("");
                      }
                    }}
                    disabled={reponse.trim() === ""}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {isTranscribing ? (
                <>
                  <span className="loader-spinner-inline" /> Transcription en cours...
                </>
              ) : (
                // Affiche toutes les réponses une fois le questionnaire terminé
                <>
                  <div style={{ marginTop: 30, width: "100%" }}>
                    {
                      questions.map((q, idx) => {
                        const audioAnswer = answers.find(a => a.index === idx && a.text && a.text.trim() !== "");
                        const writtenAnswer = writtenAnswers.find(a => a.index === idx && a.text && a.text.trim() !== "");
                        if (audioAnswer && audioAnswer.text.trim() !== "") {
                          return (
                            <div key={"audio-" + idx} className="transcription-box">
                              <strong>{q}</strong>
                              <p>{audioAnswer.text}</p>
                            </div>
                          );
                        } else if (writtenAnswer && writtenAnswer.text.trim() !== "") {
                          return (
                            <div key={"written-" + idx} className="transcription-box">
                              <strong>{q}</strong>
                              <p>{writtenAnswer.text}</p>
                            </div>
                          );
                        } else {
                          return null;
                        }
                      })
                    }
                  </div>
                  {transcription && (
                    // Zone de saisie du commentaire final et boutons de suppression / sauvegarde
                    <div className="big-transcription-wrapper" style={{ margin: "2rem auto", maxWidth: 700 }}>
                      <div className="commentaire-box">
                        <label className="font-semibold block">Commentaire du médecin :</label>
                        <textarea
                          value={commentaire}
                          onChange={(e) => setCommentaire(e.target.value)}
                          className="edit-textarea commentaire-textarea"
                          style={{ width: "100%", minHeight: 60, marginBottom: 16 }}
                        />
                      </div>
                      <div className="action-buttons" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                        <button
                          onClick={() => setTranscription("")}
                          className="btn-delete"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={handleSave}
                          className="btn-pdf"
                          disabled={isGeneratingTable || !patientName}
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
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <div style={{
          position: "fixed",
          bottom: "7rem",
          right: "1rem",
          zIndex: 200,
        }}>
        <Image src={logo2} alt="Logo Onepoint" width={67} height={25} />
      </div>
      <Footer />
    </div>
  );
}