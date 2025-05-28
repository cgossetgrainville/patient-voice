import psycopg2
#pip install psycopg2-binary

conn = psycopg2.connect(
    dbname="DB_CD34",
    user="avnadmin",
    password="14IYsxzW6e3LMmJVTq0j",
    host="postgresql-4b3783ad-o5359142f.database.cloud.ovh.net",
    port=20184,
    sslmode="require"
)
cur = conn.cursor()

# Tables à adapter depuis ton modèle Prisma !
cur.execute("""
CREATE TABLE IF NOT EXISTS patient (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enquete_de_satisfaction (
    id SERIAL PRIMARY KEY,
    transcription TEXT,
    tableau TEXT,
    pdf_transcription TEXT,
    pdf_tableau TEXT,
    pdf_rapport TEXT,
    duree FLOAT,
    date_heure TIMESTAMPTZ DEFAULT now(),
    score_satisfaction_global FLOAT,
    label_satisfaction_global TEXT,
    source TEXT,
    nombre_mots INT,
    commentaire_pro TEXT,
    patient_id INTEGER REFERENCES patient(id)
);

CREATE TABLE IF NOT EXISTS detail_satisfaction (
    id SERIAL PRIMARY KEY,
    etape_parcours TEXT,
    score_satisfaction INT,
    resume_verbatim TEXT,
    sentiment TEXT,
    score_impact INT,
    score_faisabilite INT,
    indice_priorite INT,
    etat_action TEXT,
    recommandation TEXT,
    enquete_id INTEGER REFERENCES enquete_de_satisfaction(id)
);

CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nom TEXT,
    prenom TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
""")
conn.commit()
cur.close()
conn.close()