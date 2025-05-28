// components/ForgotPasswordForm.tsx
"use client";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold mb-6 text-center">Mot de passe oublié</h2>
        <input
          className="w-full mb-4 px-4 py-2 border rounded-lg"
          type="email"
          placeholder="Ton email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Envoyer le lien</button>
        {success && <div className="text-green-600 mt-4 text-sm text-center">Un email de réinitialisation a été envoyé si le compte existe.</div>}
        <div className="text-center mt-4 text-sm">
          <a href="/" className="text-blue-500 hover:underline">Retour à la connexion</a>
        </div>
      </form>
    </div>
  );
}