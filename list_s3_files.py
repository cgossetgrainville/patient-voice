import os
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="https://s3.eu-west-par.io.cloud.ovh.net/",
    aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
)

bucket_name = "patient-voice"

response = s3.list_objects_v2(Bucket=bucket_name)

if "Contents" in response:
    for obj in response["Contents"]:
        print(obj["Key"])
else:
    print("Aucun fichier trouvé dans le bucket.")