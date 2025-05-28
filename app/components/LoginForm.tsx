"use client";
import "./LoginForm.css";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Page({ onLogin }: { onLogin?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Merci de remplir tous les champs.");
      return;
    }
    setError("");
    try {
      await axios.post("/api/login", { email, password });
      router.push("/enquete");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erreur lors de la connexion.");
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h2>Connexion</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div className="text-red-500">{error}</div>}
        <button>Se connecter</button>
        <div>
          <a href="/forgot-password">Mot de passe oublié ?</a>
        </div>
        <div>
          Pas encore de compte ? <a href="/register">Créer un compte</a>
        </div>
      </form>
    </div>
  );
}