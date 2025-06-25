import os
import boto3

def upload_to_ovh_s3(pdf_path: str, pdf_filename: str):
    s3_client = boto3.client(
        's3',
        endpoint_url="https://s3.eu-west-par.io.cloud.ovh.net/",
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
    )

    admin_prenom = os.getenv("ADMIN_PRENOM", "").strip()
    admin_nom = os.getenv("ADMIN_NOM", "").strip()
    admin_name = f"{admin_prenom}-{admin_nom}".lower().replace(" ", "_") or "admin"
    s3_key = f"{admin_name}/{pdf_filename}"
    bucket_name = "patient-voice"

    s3_client.upload_file(
        pdf_path,
        bucket_name,
        s3_key,
        ExtraArgs={
            "ACL": "public-read",
            "ContentType": "application/pdf",
            "ContentDisposition": "inline"
        }
    )
    print(s3_key)

def download_prompts_from_s3() -> dict:
    import tempfile
    import json

    admin_prenom = os.getenv("ADMIN_PRENOM", "").strip()
    admin_nom = os.getenv("ADMIN_NOM", "").strip()
    admin_name = f"{admin_prenom}-{admin_nom}".lower().replace(" ", "_") or "admin"
    s3_key = f"{admin_name}/prompts.json"
    bucket_name = "patient-voice"

    local_prompt_path = os.path.join(tempfile.gettempdir(), "prompts.json")

    try:
        s3_client = boto3.client(
            's3',
            endpoint_url="https://s3.eu-west-par.io.cloud.ovh.net/",
            aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
        )
        s3_client.download_file(bucket_name, s3_key, local_prompt_path)
    except Exception as e:
        print(f"Erreur lors du téléchargement de {s3_key} depuis S3 : {e}")
        raise

    with open(local_prompt_path, "r", encoding="utf-8") as f:
        return json.load(f)