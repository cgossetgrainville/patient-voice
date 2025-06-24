//Definit la structure HTML globale l'app

import "../styles/globals.css";
import "../styles/dashboard.css";
import "../styles/AudioRecorder.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Patient Voice",
  description: "Prototype d'enregistrement de verbatim patient",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen">
          <main className="main-container">{children}</main>
        </div>
      </body>
    </html>
  );
}