"use client";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const [adminInfo, setAdminInfo] = useState<{ prenom: string; nom: string } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(res => res.ok ? res.json() : null)
      .then(setAdminInfo);
  }, []);

  return (
    <aside className="sidebar">
      <div className="p-6">
        <ul className="space-y-4">
          <li className="nav-item"><a href="/pages/enquete" className="nav-link">Enquête</a></li>
          <li className="nav-item"><a href="/pages/questionnaire" className="nav-link">Questionnaire</a></li>
          <li className="nav-item"><a href="/pages/dashboard" className="nav-link">Dashboard</a></li>
          <li className="nav-item"><a href="/pages/parametres" className="nav-link">Paramètres</a></li>
        </ul>
      </div>
      <div className="p-6 border-t border-blue-500 flex flex-col items-center">
        <div className="w-8 h-8 bg-blue-300 text-white rounded-full flex items-center justify-center mb-2 text-sm">
          {adminInfo?.prenom?.charAt(0).toUpperCase() ?? " "}
        </div>
        <p className="text-sm text-center">
          {adminInfo ? `${adminInfo.prenom} ${adminInfo.nom}` : "Chargement..."}
        </p>
        <p className="text-xs text-blue-200">Profil</p>
      </div>
    </aside>
  );
}