# Patient Voice – Onepatient

**Onepatient** est une plateforme web complète destinée aux établissements de santé pour **capturer, transcrire, analyser et restituer la voix du patient** sous forme structurée et exploitable.

Développée avec **Next.js**, **Python** et **PostgreSQL**, elle centralise les retours d’expérience patient dans une interface moderne, simple, responsive et extensible.

---

## ✨ Fonctionnalités principales

- 🔐 Authentification sécurisée (inscription, connexion, mot de passe oublié)
- 🎙️ Enregistrement audio depuis le navigateur
- 📂 Upload de fichiers audio (.mp3, .wav, .m4a) et texte (.txt, .docx)
- 🤖 Transcription automatique via OVH Speech-to-Text
- 📝 Extraction directe de contenu depuis fichiers texte
- 🧠 Analyse NLP (sentiments, émotions, thématiques) avec Mistral/HuggingFace
- 📊 Génération de tableaux structurés depuis les verbatims
- 📄 Génération automatique de rapports PDF
- 🧰 Personnalisation des prompts d’analyse
- 💾 Sauvegarde des résultats (textes, tableaux, PDFs) via PostgreSQL & OVH Object Storage
- 👩‍⚕️ Dashboard administrateur avec gestion des enregistrements

---

## 🧱 Architecture technique

Le projet est organisé de manière modulaire et lisible, selon des principes inspirés du **Domain Driven Design (DDD)** :

```
/app
│   ├── api/                ⇨ Endpoints Next.js API (transcription, login, save...)
│   └── pages/              ⇨ Pages du site (login, dashboard, rapport...)
/components                 ⇨ Composants généraux réutilisables (Sidebar, Footer, etc.)
/features/transcription    ⇨ Logique métier autour de la transcription (composants, hooks)
/scripts                   ⇨ Scripts Python pour la génération de rapport PDF
│   ├── utils/             ⇨ Fonctions partagées : OpenAI, PDF, S3
/aws                       ⇨ Fonctions liées à OVH Object Storage
/public                    ⇨ Images statiques, icônes
/styles                    ⇨ Fichiers CSS globaux
/data                      ⇨ Données de configuration (ex: prompts.json)
```

---

## 📁 Exemple de contenu `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:32776
NEXT_PUBLIC_BASE_URL=http://localhost:32776/
DATABASE_URL=postgresql://avnadmin:xxxxx
OVH_API_KEY=xxxxx
S3_ACCESS_KEY=xxxxx
S3_SECRET_KEY=xxxxx
```

---

## 🧪 Démarrage rapide

### Prérequis

- Docker Desktop
- Node.js ≥ 18
- VSCode avec extension **Dev Containers**

### Installation

```bash
git clone https://github.com/cgossetgrainville/patient-voice.git
cd patient-voice
cp .env.example .env.local  # Personnalisez selon votre environnement
```

### Lancer dans un DevContainer (recommandé)

> Ouvrir le dossier avec VSCode ➝ « Ouvrir dans Dev Container »

Sinon :

```bash
npm install
npm run dev
```

---

## 🗣️ Fonctionnement transcription & analyse

### Upload et transcription

- L'utilisateur peut :
  - Enregistrer directement sa voix via navigateur (micro)
  - Importer un fichier `.wav`, `.mp3`, `.m4a`, `.txt` ou `.docx`
- Les fichiers `.txt` et `.docx` sont lus directement (pas de transcription)
- Les fichiers audio sont envoyés à l’API OVH ASR pour transcription

### Analyse & structuration

- Une fois le texte récupéré, il est envoyé à un modèle Mistral via prompt
- Le résultat renvoie :
  - Un **tableau structuré** (catégories, scores, sentiments, émotions)
  - Une **synthèse en langage naturel**
- Les prompts sont définis dans `data/prompts.json` et **modifiables via l’interface admin**

---

## 🧩 Composants clés

- `AudioRecorder.tsx` : enregistrement vocal
- `useRecorder.ts` : hook pour capturer et convertir le micro en blob audio
- `useUploader.ts` : gestion de l'upload de fichiers (audio + texte)
- `Sidebar.tsx` / `Footer.tsx` : navigation commune
- `PatientNameForm.tsx` : formulaire initial pour identifier le patient

---

## 📄 Scripts Python

Les scripts de génération de PDF utilisent `reportlab`. Leur logique est séparée dans :

- `scripts/rapport.py` : génération de rapport complet
- `scripts/table.py` : génération de tableau structuré
- `utils/openai_utils.py`, `pdf_utils.py`, `s3_utils.py` : fonctions partagées

Chaque inscription admin crée dynamiquement une base PostgreSQL à son nom (via Prisma).

---

## 📱 UX

- Sidebar se replie en menu déroulant sur mobile
- Séparation claire entre **front (Next.js)** et **back (API routes + scripts Python)**

---

## ⚙️ Personnalisation des prompts

L'administrateur peut ajuster dynamiquement les prompts utilisés pour l'analyse :

```
data/prompts.json

{
  "pdf_rapport": "Voici un prompt de synthèse...",
  "tableau": "Voici un prompt d'extraction de tableau structuré..."
}
```

Ces prompts sont injectés dans les appels à l’API LLM (Mistral/HF).

---


## ☁️ Déploiement

- L'application peut être déployée sur **OVH** : https://patient-voice.lab-inno-op.fr/
- Les fichiers sont stockés sur **OVH Object Storage (S3 compatible)**

---


## 📜 Licence

MIT — libre utilisation, modification, et déploiement.
