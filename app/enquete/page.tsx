"use client";
import { useState, useEffect } from "react";
import AudioRecorder from "../components/AudioRecorder";
import "../dashboard/dashboard.css";
import Image from "next/image";
import logo1 from "../logo/logo1.png";
import logo2 from "../logo/logo2.png";

export default function Home() {

  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [patientName, setPatientName] = useState("");
  const [adminInfo, setAdminInfo] = useState<{ prenom: string; nom: string } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then(setAdminInfo);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="sidebar">
        <div className="p-6">
          <ul className="space-y-4">
            <li className="nav-item">
              <a href="/enquete" className="nav-link">Enquête</a>
            </li>
            <li className="nav-item">
              <a href="/questionnaire" className="nav-link">Questionnaire</a>
            </li>
            <li className="nav-item">
              <a href="/dashboard" className="nav-link">Dashboard</a>
            </li>
            <li className="nav-item">
              <a href="/parametres" className="nav-link">Parametres</a>
            </li>
          </ul>
        </div>
        <div className="p-6 border-t border-blue-500 flex flex-col items-center">
          <div className="w-8 h-8 bg-blue-300 text-white rounded-full flex items-center justify-center mb-2 text-sm">
            {adminInfo?.prenom?.charAt(0).toUpperCase() ?? "J"}
          </div>
          <p className="text-sm text-center">
            {adminInfo ? `${adminInfo.prenom} ${adminInfo.nom}` : "Chargement..."}
          </p>
          <p className="text-xs text-blue-200">Profil</p>
        </div>
      </aside>
      <div className="patient-name-fixed">
        <label htmlFor="patientName" className="homepage-label">
          Nouveau Patient
        </label>
        <input
          type="text"
          id="patientName"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Prénom  -  Nom"
          className="homepage-input"
        />
      </div>
      <main className="main-container flex-1 px-6 ml-32">
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
        <div style={{
          position: "fixed",
          bottom: "7rem",
          right: "1rem",
          zIndex: 200,
        }}>
          <Image src={logo2} alt="Logo Onepoint" width={67} height={25} />
        </div>
      </main>
      <div className="footer-bar">
        <footer className="text-sm text-gray-400">Prototype – Onepoint © 2025</footer>
      </div>
    </div>
  );
}