// Typage des données envoyées à l'API de sauvegarde
export interface TranscriptionPayload {
  patientName: string;
  audioDuration: number | null;
  transcription: string;
  commentaire: string;
  cleanData: any;
  tableData: any;
}