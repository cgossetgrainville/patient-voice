"use client";
import { Dispatch, SetStateAction } from "react";

interface PatientNameFormProps {
  prenom: string;
  setPrenom: Dispatch<SetStateAction<string>>;
  nom: string;
  setNom: Dispatch<SetStateAction<string>>;
}

export default function PatientNameForm({ prenom, setPrenom, nom, setNom }: PatientNameFormProps) {
  return (
    <div className="patient-name-fixed" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <label className="homepage-label">Nouveau Patient</label>
      <input
        type="text"
        id="prenom"
        value={prenom}
        onChange={(e) => setPrenom(e.target.value)}
        placeholder="Prénom"
        className="homepage-input"
        style={{ marginBottom: "10px", maxWidth:"7rem" }}
      />
      <input
        type="text"
        id="nom"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom"
        className="homepage-input"
        style={{ marginBottom: "10px", maxWidth:"7rem" }}
      />
    </div>
  );
}