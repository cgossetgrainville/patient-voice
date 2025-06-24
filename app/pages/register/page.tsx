// Page d'inscription 
"use client";
import "../../../styles/LoginForm.css";
import { useState } from "react";
import axios from "axios";

export default function RegisterPage() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prenom || !email || !password || !confirm) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError("");
    try {
      await axios.post("/api/register", { nom, prenom, email, password });
      alert("Inscription réussie !");
      setNom("");
      setPrenom("");
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'inscription.");
    }
  };

  //?=============?//
  //?   H T M L   ?//
  //?=============?//
    return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Créer un compte</h2>
        <input type="text" placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)} />
        <input type="text" placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
        <input type="password" placeholder="Confirme le mot de passe" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {error && <div className="text-red-500">{error}</div>}
        <button>S’inscrire</button>
        <div>Déjà un compte ? <a href="/">Se connecter</a></div>
      </form>
    </div>
  );
}