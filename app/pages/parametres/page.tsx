"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
const logo1 = "/images/logo1.png";
const logo2 = "/images/logo2.png";
import "../../../styles/dashboard.css";
import "../../../styles/AudioRecorder.css";
import "../../../styles/homepage.css";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";

export default function ParametresPage() {
  const [adminInfo, setAdminInfo] = useState<{ prenom: string; nom: string } | null>(null);
  const [prompts, setPrompts] = useState<{
    cleaning_prompt: string;
    rapport_prompt: string;
    table_prompt: string;
    questionnaire_questions: string;
    etapes_prompt: string; // <- Ajouté
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) router.push("/");
        else setAdminInfo(data);
      });
  }, []);

  useEffect(() => {
    if (adminInfo) {
      fetch(`/api/prompts?prenom=${adminInfo.prenom}&nom=${adminInfo.nom}`)
        .then(res => res.ok ? res.json() : null)
        .then(setPrompts);
    }
  }, [adminInfo]);

  const handleLogout = async () => {
    await fetch("/api/logout");
    router.push("/");
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-prenom": adminInfo?.prenom || "",
        "x-admin-nom": adminInfo?.nom || "",
      },
      body: JSON.stringify(prompts),
    });

    if (res.ok) {
      const refresh = await fetch("/api/prompts/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-prenom": adminInfo?.prenom || "",
          "x-admin-nom": adminInfo?.nom || "",
        },
        body: JSON.stringify(prompts),
      });

      if (refresh.ok) {
        alert("Prompts mis à jour avec succès !");
      } else {
        alert("Prompts enregistrés mais non rafraîchis.");
      }
    } else {
      const error = await res.json();
      console.error("Erreur de sauvegarde :", error);
      alert("Erreur lors de la sauvegarde : " + (error.details || "inconnue"));
    }
    setSaving(false);
    // alert("Prompts mis à jour avec succès !");
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="main-container">
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
              <div style={{ fontSize: "1rem", fontWeight: "bold" }}>Prompt des questions</div>
              <textarea
                className="edit-textarea"
                style={{ marginBottom: "1rem" }}
                value={prompts.questionnaire_questions}
                onChange={e => setPrompts({ ...prompts, questionnaire_questions: e.target.value })}
              />
              <div style={{ fontSize: "1rem", fontWeight: "bold" }}>Étape du parcours</div>
              <textarea
                className="edit-textarea"
                style={{ marginBottom: "1rem" }}
                value={prompts.etapes_prompt}
                onChange={e => setPrompts({ ...prompts, etapes_prompt: e.target.value })}
              />
              <div style={{ fontSize: "1rem", fontWeight: "bold" }}>Prompt de nettoyage</div>
              <textarea
                className="edit-textarea"
                style={{ marginBottom: "1rem" }}
                value={prompts.cleaning_prompt}
                onChange={e => setPrompts({ ...prompts, cleaning_prompt: e.target.value })}
              />
              <div style={{ fontSize: "1rem", fontWeight: "bold" }}>Prompt du Rapport de Satisfaction</div>
              <textarea
                className="edit-textarea"
                style={{ marginBottom: "1rem" }}
                value={prompts.rapport_prompt}
                onChange={e => setPrompts({ ...prompts, rapport_prompt: e.target.value })}
              />
              <div style={{ fontSize: "1rem", fontWeight: "bold" }}>Prompt d’analyse (tableau)</div>
              <textarea
                className="edit-textarea"
                style={{ marginBottom: "1rem" }}
                value={prompts.table_prompt}
                onChange={e => setPrompts({ ...prompts, table_prompt: e.target.value })}
              />
              <button
                onClick={async () => {
                  const confirmed = window.confirm("Êtes-vous sûr de vouloir réinitialiser les prompts ?");
                  if (!confirmed) return;

                  const res = await fetch("/api/prompts/reset", {
                    method: "POST",
                    headers: {
                      "x-admin-prenom": adminInfo?.prenom || "",
                      "x-admin-nom": adminInfo?.nom || "",
                    },
                  });
                  if (res.ok) {
                    location.reload();
                  } else {
                    alert("Échec de la réinitialisation.");
                  }
                }}
                className="btn-delete"
                style={{ marginRight: "1rem" }}
              >
                Réinitialiser les prompts
              </button>
              
              <button
                onClick={handleSave}
                className="btn-pdf"
                style={{ marginLeft: "1rem" }}
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

      <Footer />
    </div>
  );
}