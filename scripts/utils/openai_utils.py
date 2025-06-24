import os
from openai import OpenAI

def get_openai_client():
    return OpenAI(
        base_url="https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
        api_key=os.getenv("OVH_API_KEY")
    )