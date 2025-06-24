 "use client";

import { useState, useEffect } from "react";
import AudioRecorder from "../../features/transcription/components/AudioRecorder";
import PatientNameForm from "../../../components/PatientNameForm";
import "../../../styles/dashboard.css";
import Image from "next/image";
const logo1 = "/images/logo1.png";
const logo2 = "/images/logo2.png";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";

export default function Home() {

  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const patientName = `${prenom}-${nom}`;
  const [adminInfo, setAdminInfo] = useState<{ prenom: string; nom: string } | null>(null);

  // Recuperation des infos de l'admin 
  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then(setAdminInfo);
  }, []);

  //?=============?//
  //?   H T M L   ?//
  //?=============?//
 
  // Affichage principal de la page
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <PatientNameForm prenom={prenom} setPrenom={setPrenom} nom={nom} setNom={setNom} />
      {/* Contenu principal */}
      <main className="main-container">
        <div className="homepage-header">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Image src={logo1} alt="Logo Patient Voice" width={440} height={160} />
          </div>
          <p className="homepage-subtitle">
            Prototypage d’un outil d’écoute patient
          </p>
        </div>
        <AudioRecorder
          patientName={patientName}
        />
      {/* Logo */}
        <div style={{
          position: "fixed",
          bottom: "7rem",
          right: "1rem",
          zIndex: 200,
        }}>
          <Image src={logo2} alt="Logo Onepoint" width={67} height={25} />
        </div>
      </main>
      <Footer />
    </div>
  );
}