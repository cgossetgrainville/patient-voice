// Page de réinitialisation de mot de passe
"use client";
import { useState } from "react";
import "../../../styles/LoginForm.css";


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Renseigne ton email.");
      return;
    }
    setError("");
    fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(res => {
      if (!res.ok) {
        return res.json().then(data => {
          throw new Error(data.error || "Erreur inconnue");
        });
      }
      return res.json();
    }).then(() => {
      setSuccess(true);
    }).catch(err => {
      setError(err.message);
    });
  };

  //?=============?//
  //?   H T M L   ?//
  //?=============?//
    
  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2 >Mot de passe oublié</h2>
        <input
          type="email"
          placeholder="Ton email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
        <button>
          Envoyer le lien
        </button>
        {success && (
          <div className="text-green-600 mt-4 text-sm text-center">
            Un email de réinitialisation a été envoyé si le compte existe.
          </div>
        )}
        <div className="text-center mt-4 text-sm">
          <a href="/" className="text-blue-500 hover:underline">Retour à la connexion</a>
        </div>
      </form>
    </div>
  );
}