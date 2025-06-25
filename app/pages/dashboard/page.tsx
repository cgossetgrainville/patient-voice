"use client";
import "../../../styles/dashboard.css";
import "../../../styles/homepage.css";

import Image from "next/image";
const logo1 = "/images/logo1.png";
const o = "/images/o.png";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {

  // Données globales récupérées depuis l'API
  const [data, setData] = useState<any>(null);
  const [adminInfo, setAdminInfo] = useState<{ prenom: string; nom: string } | null>(null);

  // États de tri pour Problèmes
  const [problemsSortKey, setProblemsSortKey] = useState("indice_priorite");
  const [problemsSortOrder, setProblemsSortOrder] = useState<"asc" | "desc">("desc");
  // Filtre pour état d'action
  const [etatFilter, setEtatFilter] = useState<string>("Tous");

  // États de tri pour Enquêtes
  const [enquetesSortKey, setEnquetesSortKey] = useState("score_satisfaction_global");
  const [enquetesSortOrder, setEnquetesSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  // Fonction de tri générique
  function sortData<T>(arr: T[], key: keyof T, order: "asc" | "desc") {
    return arr.slice().sort((a, b) => {
      const getValue = (obj: any, key: keyof T) => {
        if (key === "prenom") return obj.patient?.prenom ?? "";
        if (key === "nom") return obj.patient?.nom ?? "";
        return obj[key];
      };
      const valA = getValue(a, key);
      const valB = getValue(b, key);

      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === "number" && typeof valB === "number") {
        return order === "asc" ? valA - valB : valB - valA;
      }
      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  // Fonction pour mettre à jour l'état d'action d'un problème (À faire, En cours, Résolu)
  const updateEtat = async (id: number, newEtat: string) => {
    await fetch("/api/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, etat_action: newEtat }),
    });

    setData((prev: any) => ({
      ...prev,
      problems: prev.problems.map((p: any) =>
        p.id === id ? { ...p, etat_action: newEtat } : p
      ),
    }));
  };

  // Récupération des données de tableau
  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData);
  }, []);
  // Récupération des infos de l'admin connecté
  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then(setAdminInfo);
  }, []);

  // Spinner de chargement de la page
  if (!data) {
    return (
      <div className="loading-spinner-wrapper">
        <Image src={o} alt="Chargement..." className="rotating-spinner" width={64} height={64} unoptimized />
      </div>
    );
  }

  // Affichage principal du tableau de bord
  //?=============?//
  //?   H T M L   ?//
  //?=============?//
  
  return (
    <div className="flex min-h-screen">
    <Sidebar />
      {/* Contenu principal du dashboard */}
      <main className="main-container">
        <div className="homepage-header mb-25">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "3rem"}}>
          <Image src={logo1} alt="Logo Patient Voice" width={300} height={300} style={{ objectFit: "contain" }} />
        </div>
          <div className="dashboard-container">
            {/* Graphique d'évolution de la satisfaction par jour */}
            <div className="dashboard-grid-2">
              <div className="dashboard-card">
                <p className="dashboard-section-title">
                  Évolution de la satisfaction globale (moyenne journalière)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.satisfactionParJour} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={str => {
                      if (!str) return '';
                      const [yyyy, mm, dd] = str.split("-");
                      return `${dd}/${mm}`;
                    }} />
                    <YAxis domain={[0, 10]} />
                    <Tooltip
                      formatter={(value) => (typeof value === "number" ? value.toFixed(1) : value)}
                      labelFormatter={(label) => {
                        if (!label) return '';
                        const [yyyy, mm, dd] = label.split("-");
                        return `${dd}/${mm}/${yyyy}`;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="moyenne" stroke="#1d4ed8" strokeWidth={3} name="Score moyen" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Diagramme en barres des notes moyennes par thématique */}
              <div className="dashboard-card">
                <p className="dashboard-section-title">Note moyenne par étape</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.themes} layout="vertical">
                    <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 14 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={250}
                      tick={{ fontSize: 14, fill: '#111827' }}
                    />
                    <Tooltip formatter={(value) => (typeof value === "number" ? value.toFixed(1) : value)} />
                    <Legend wrapperStyle={{ fontSize: 14 }} />
                    <Bar dataKey="sentiment" fill="#1d4ed8" name="Score moyen" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Indicateurs principaux */}
            <div className="dashboard-grid-2">
              <div className="dashboard-card">
                <p className="dashboard-card-title">Sentiment moyen global</p>
                <p className="dashboard-card-value">{data?.sentimentMoyen?.toFixed(2) ?? "—"}</p>
              </div>
              <div className="dashboard-card">
                <p className="dashboard-card-title">Nombre de verbatims analysés</p>
                <p className="dashboard-card-value">{data.totalVerbatims}</p>
              </div>
            </div>

            {/* Tableau des Problemes */}
            {data.problems && data.problems.length > 0 && (
              <div className="dashboard-card">
                <p className="problems-title">Problèmes prioritaires identifiés</p>
                <div className="problems-table-wrapper">
                  <table className="problems-table">
                    <thead>
                      <tr>
                        <th
                          onClick={() => {
                            setProblemsSortKey("etape_parcours");
                            setProblemsSortOrder(problemsSortKey === "etape_parcours" && problemsSortOrder === "asc" ? "desc" : "asc");
                          }}
                        >
                          Étape du parcours {problemsSortKey === "etape_parcours" ? (problemsSortOrder === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th>
                          Résumé du verbatim
                        </th>
                        <th
                          className="text-center"
                          onClick={() => {
                            setProblemsSortKey("indice_priorite");
                            setProblemsSortOrder(problemsSortKey === "indice_priorite" && problemsSortOrder === "asc" ? "desc" : "asc");
                          }}
                        >
                          Indice de priorité {problemsSortKey === "indice_priorite" ? (problemsSortOrder === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th>
                          Recommandation
                        </th>
                        <th className="text-center">
                          <div style={{ justifyContent: "space-between", alignItems: "center" }}>
                            <select
                              id="text-center"
                              value={etatFilter}
                              onChange={(e) => setEtatFilter(e.target.value)}
                            >
                              <option value="Tous">État</option>
                              <option value="À faire">À faire</option>
                              <option value="En cours">En cours</option>
                              <option value="Résolu">Résolu</option>
                            </select>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortData(data.problems, problemsSortKey as string, problemsSortOrder)
                        .filter((p: any) => etatFilter === "Tous" || p.etat_action === etatFilter)
                        .map((p: any, index: number) => (
                        <tr key={index} className="table-row-hover">
                          <td className="font-semibold">{p.etape_parcours}</td>
                          <td className="verbatim-summary">{p.resume_verbatim}</td>
                          <td className="text-center">{p.indice_priorite}</td>
                          <td className="text-recommandations">{p.recommandation}</td>
                          <td style={{ verticalAlign: "middle" }}>
                            <div className="etat-buttons">
                              <button
                                className={`etat-button ${
                                  p.etat_action === "À faire" ? "etat-a-faire-active" : "etat-a-faire"
                                }`}
                                onClick={() => updateEtat(p.id, "À faire")}
                              >
                                À faire
                              </button>
                              <button
                                className={`etat-button ${
                                  p.etat_action === "En cours" ? "etat-en-cours-active" : "etat-en-cours"
                                }`}
                                onClick={() => updateEtat(p.id, "En cours")}
                              >
                                En cours
                              </button>
                              <button
                                className={`etat-button ${
                                  p.etat_action === "Résolu" ? "etat-resolu-active" : "etat-resolu"
                                }`}
                                onClick={() => updateEtat(p.id, "Résolu")}
                              >
                                Résolu
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tableau des Enquetes (avec PDFs) */}
            {data.enquetes && data.enquetes.length > 0 && (
              <div className="dashboard-card">
                <p className="problems-title">Historique des enquêtes de satisfaction</p>
                <input
                  type="text"
                  placeholder="Recherche patient"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ marginBottom: "1rem", padding: "0.5rem", width: "100%", maxWidth: "150px", borderRadius: "10px", border: "1px solid #ccc" }}
                />
                <div className="problems-table-wrapper">
                  <table className="problems-table">
                    <thead>
                      <tr>
                        <th onClick={() => {
                          setEnquetesSortKey("prenom");
                          setEnquetesSortOrder(enquetesSortKey === "prenom" && enquetesSortOrder === "asc" ? "desc" : "asc");
                        }}>
                          Prénom {enquetesSortKey === "prenom" ? (enquetesSortOrder === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th onClick={() => {
                          setEnquetesSortKey("nom");
                          setEnquetesSortOrder(enquetesSortKey === "nom" && enquetesSortOrder === "asc" ? "desc" : "asc");
                        }}>
                          Nom {enquetesSortKey === "nom" ? (enquetesSortOrder === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th className="text-center" onClick={() => {
                          setEnquetesSortKey("score_satisfaction_global");
                          setEnquetesSortOrder(enquetesSortKey === "score_satisfaction_global" && enquetesSortOrder === "asc" ? "desc" : "asc");
                        }}>
                          Score Global {enquetesSortKey === "score_satisfaction_global" ? (enquetesSortOrder === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th onClick={() => {
                          setEnquetesSortKey("label_satisfaction_global");
                          setEnquetesSortOrder(enquetesSortKey === "label_satisfaction_global" && enquetesSortOrder === "asc" ? "desc" : "asc");
                        }}>
                          Niveau de satisfaction {enquetesSortKey === "label_satisfaction_global" ? (enquetesSortOrder === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th>Transcription</th>
                        <th>Tableau</th>
                        <th>Rapport</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortData(data.enquetes, enquetesSortKey as string, enquetesSortOrder)
                        .filter((e: any) => {
                          const query = searchQuery.toLowerCase();
                          return (
                            e.patient?.prenom?.toLowerCase().includes(query) ||
                            e.patient?.nom?.toLowerCase().includes(query)
                          );
                        })
                        //.slice(0, 10) // coupe à 10 lignes
                        .map((e: any, index: number) => (
                        <tr key={index} className="table-row-hover">
                          <td>{e.patient?.prenom}</td>
                          <td>{e.patient?.nom}</td>
                          <td className="text-center">{e.score_satisfaction_global?.toFixed(2)}</td>
                          <td>{e.label_satisfaction_global}</td>
                          <td>
                            <button
                              className="text-blue-600 underline"
                              onClick={() => {
                                // Remove any /tmp/ prefix from the s3_key if present
                                const rawKey = e.pdf_transcription?.replace(/^\/tmp\//, "");
                                const admin = adminInfo ? `${adminInfo.prenom}-${adminInfo.nom}`.toLowerCase().replace(/\s+/g, "_") : "inconnu";
                                const url = `https://patient-voice.s3.eu-west-par.io.cloud.ovh.net/${admin}/${rawKey}`;
                                window.open(url, "_blank", "popup,width=800,height=600");
                              }}
                            >
                              Voir PDF
                            </button>
                          </td>
                          <td>
                            <button
                              className="text-blue-600 underline"
                             onClick={() => {
                                // Remove any /tmp/ prefix from the s3_key if present
                                const rawKey = e.pdf_tableau?.replace(/^\/tmp\//, "");
                                const admin = adminInfo ? `${adminInfo.prenom}-${adminInfo.nom}`.toLowerCase().replace(/\s+/g, "_") : "inconnu";
                                const url = `https://patient-voice.s3.eu-west-par.io.cloud.ovh.net/${admin}/${rawKey}`;
                                window.open(url, "_blank", "popup,width=800,height=600");
                              }}
                            >
                              Voir PDF
                            </button>
                          </td>
                          <td>
                            <button
                              className="text-blue-600 underline"
                              onClick={() => {
                                // Remove any /tmp/ prefix from the s3_key if present
                                const rawKey = e.pdf_rapport?.replace(/^\/tmp\//, "");
                                const admin = adminInfo ? `${adminInfo.prenom}-${adminInfo.nom}`.toLowerCase().replace(/\s+/g, "_") : "inconnu";
                                const url = `https://patient-voice.s3.eu-west-par.io.cloud.ovh.net/${admin}/${rawKey}`;
                                window.open(url, "_blank", "popup,width=800,height=600");
                              }}
                            >
                              Voir PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
