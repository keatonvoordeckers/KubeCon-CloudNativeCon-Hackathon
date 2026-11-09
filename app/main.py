import os

from elasticsearch import Elasticsearch
from fastapi import FastAPI

# Settings come from .env
ES_URL = os.environ["ES_URL"]
ES_INDEX = os.environ["ES_INDEX"]

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
    """ Build query as a dictionary representing a Kibana JSON, returns everything if search is empty """
    if q.strip():
        query = {
            "multi_match": {
                "query": q,
                "fields": ["title^3", "abstract", "speakers.name"],
                "fuzziness": "AUTO",
            }
        }
    else:
        query = {"match_all": {}}

    # Returns at most 50 talks
    resp = es.search(index=ES_INDEX, query=query, size=50)

    # Pull out talks and return them
    talks = [hit["_source"] 
             for hit in resp["hits"]["hits"]]
    
    return {
        "total": resp["hits"]["total"]["value"], 
        "talks": talks
    }
