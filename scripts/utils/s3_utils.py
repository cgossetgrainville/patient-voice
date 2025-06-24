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