// /app/components/StartButton.tsx
"use client";

export default function StartButton() {
  return (
    <button
      onClick={() => console.log("Démarrage")}
      className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Démarrer
    </button>
  );
}