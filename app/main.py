import os

from elasticsearch import Elasticsearch
from fastapi import FastAPI

# Settings come from .env
ES_URL = os.environ["ES_URL"]
ES_INDEX = os.environ["ES_INDEX"]

es = Elasticsearch(ES_URL)

app = FastAPI(title="KubeCon Talk Explorer")

# When someone runs GET request, run health()
@app.get("/health")
def health():
    return {
        "elasticsearch": es.ping(),
        "talks": es.count(index=ES_INDEX)["count"],
    }