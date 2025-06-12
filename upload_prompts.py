import boto3
import os

# Configuration (mets tes vraies clés ici ou dans tes variables d'env)
access_key = "54c561c7d47e4eeab04449a443fb5355"
secret_key = "76fa2eba5e1b4967b74ed51786facf4f"

# Client S3 OVH
s3_client = boto3.client(
    "s3",
    endpoint_url="https://s3.eu-west-par.io.cloud.ovh.net/",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
)

# Infos fichier
local_file = "/workspaces/patient-voice/data/prompts.json"
bucket_name = "patient-voice"
s3_key = "prompts.json"

# Upload
s3_client.upload_file(
    Filename=local_file,
    Bucket=bucket_name,
    Key=s3_key,
    ExtraArgs={
        "ACL": "public-read",
        "ContentType": "application/json"
    }
)

print("✅ prompts.json mis à jour sur S3.")