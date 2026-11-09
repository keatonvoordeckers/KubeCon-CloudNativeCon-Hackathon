import os

from elasticsearch import Elasticsearch
from fastapi import FastAPI
from openai import OpenAI

# Settings come from .env
ES_URL = os.environ["ES_URL"]
ES_INDEX = os.environ["ES_INDEX"]

ai = OpenAI()

es = Elasticsearch(ES_URL)

app = FastAPI(title="KubeCon Talk Explorer")

@app.get("/health")
def health():
    """ Runs on a GET request """ 
    return {
        "elasticsearch": es.ping(),
        "talks": es.count(index=ES_INDEX)["count"],
    }

@app.get("/search")
def search(q: str = ""):
    """ 
    Hybrid search: keyword + semantic scores combined on every query.
    Empty search returns everything. Falls back to keyword-only if OpenAI is unavailable.
    """

    # Keyword 
    if q.strip():
        query = {
            "multi_match": {
                "query": q,
                "fields": ["title^3", "abstract", "speakers.name"],
                "fuzziness": "AUTO",
                "minimum_should_match": "50%",
            }
        }
    else:
        query = {"match_all": {}}

    # Semantic (only when there's text to embed)
    knn = None
    if q.strip():
        try:
            vector = ai.embeddings.create(model="text-embedding-3-small", input=q).data[0].embedding
            knn = {
                "field": "embedding",
                "query_vector": vector,
                "k": 10,                 # only the 10 closest talks join from the semantic side
                "num_candidates": 100,
                "boost": 10,
            }
        except Exception:
            knn = None  # OpenAI unavailable → keyword only

    # One search with both parts
    resp = es.search(
        index=ES_INDEX,
        query=query,
        knn=knn,
        size=50,
        source_excludes=["embedding"],
    )

    talks = [hit["_source"] for hit in resp["hits"]["hits"]]
    return {
        "total": resp["hits"]["total"]["value"],
        "talks": talks,
    }

