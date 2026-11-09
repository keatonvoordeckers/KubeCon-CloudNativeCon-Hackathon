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
def search(q: str = "", mode: str = "keyword"):
    """ 
    Build query as a dictionary representing a Kibana JSON, returns everything if search is empty.
    Mode can either be 'keyword', 'semantic', or 'hybrid' (keyword by default)
    """
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
        query = {
            "match_all": {}
            }

    knn = None # Find 50 talks whose embeddings are closest to the question.
    if q.strip() and mode in ("semantic", "hybrid"):
        vector = ai.embeddings.create(model="text-embedding-3-small", input=q).data[0].embedding
        knn = {"field": "embedding", "query_vector": vector, "k": 50, "num_candidates": 200, "boost": 10}
        if mode == "semantic":
            query = None  # vectors only
    
    resp = es.search(
        index=ES_INDEX, 
        query=query, 
        knn=knn, 
        size=50, 
        source_excludes=["embedding"]
    )

    # Pull out talks and return them
    talks = [hit["_source"] for hit in resp["hits"]["hits"]]
    return {
        "total": resp["hits"]["total"]["value"], 
        "talks": talks
    }

