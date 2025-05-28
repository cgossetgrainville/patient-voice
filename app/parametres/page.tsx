"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo1 from "../logo/logo1.png";
import logo2 from "../logo/logo2.png";
import "../dashboard/dashboard.css";
import "../components/AudioRecorder.css";
import "../homepage.css";


export default function ParametresPage() {
  const [adminInfo, setAdminInfo] = useState<{ prenom: string; nom: string } | null>(null);
  const [prompts, setPrompts] = useState<{ cleaning_prompt: string; rapport_prompt: string; table_prompt: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) router.push("/");
        else setAdminInfo(data);
      });

    fetch("/api/prompts")
      .then(res => res.ok ? res.json() : null)
      .then(setPrompts);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout");
    router.push("/");
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompts)
    });
    setSaving(false);
    alert("Prompts mis à jour avec succès !");
  };

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

      <main className="main-container ml-32">
        <div className="homepage-header">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center"}}>
          <Image src={logo1} alt="Logo Patient Voice" width={300} height={300} style={{ objectFit: "contain" }} />
        </div>
          <p className="homepage-subtitle"> Paramètres administrateur</p>
        </div>

        <div className="parametres-wrapper">
          {adminInfo && (
            <div style={{ marginBottom: "2rem" }}>
              <p><strong>Prénom :</strong> {adminInfo.prenom}</p>
              <p><strong>Nom :</strong> {adminInfo.nom}</p>
              <button onClick={handleLogout} className="btn-delete mt-4">Se déconnecter</button>
            </div>
          )}

          {prompts ? (
            <div>
              <h1>Prompt de nettoyage</h1>
              <textarea
                className="edit-textarea"
                value={prompts.cleaning_prompt}
                onChange={e => setPrompts({ ...prompts, cleaning_prompt: e.target.value })}
              />
              <h1>Prompt du Rapport de Satisfaction</h1>
              <textarea
                className="edit-textarea"
                value={prompts.rapport_prompt}
                onChange={e => setPrompts({ ...prompts, rapport_prompt: e.target.value })}
              />
              <h1>Prompt d’analyse (tableau)</h1>
              <textarea
                className="edit-textarea"
                value={prompts.table_prompt}
                onChange={e => setPrompts({ ...prompts, table_prompt: e.target.value })}
              />
              <button
                onClick={handleSave}
                className="btn-pdf"
                disabled={saving}
              >
                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
              </button>
            </div>
          ) : (
            <p>Chargement des prompts…</p>
          )}
        </div>

        <div style={{ position: "fixed", bottom: "7rem", right: "1rem", zIndex: 200 }}>
          <Image src={logo2} alt="Logo Onepoint" width={67} height={25} />
        </div>
      </main>

      <div className="footer-bar">
        <footer className="text-sm text-gray-400">Prototype – Onepoint © 2025</footer>
      </div>
    </div>
  );
}