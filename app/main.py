import os

from elasticsearch import Elasticsearch
from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from openai import OpenAI

from app.search import AGGS, build_filters, build_query, parse_aggs

# Settings come from .env
ES_URL = os.environ["ES_URL"]
ES_INDEX = os.environ["ES_INDEX"]

ai = OpenAI()

es = Elasticsearch(ES_URL)

app = FastAPI(title="KubeCon Talk Explorer")

@app.get("/health")
def health():
    """ 
    Runs on a GET request 
    """ 
    return {
        "elasticsearch": es.ping(),
        "talks": es.count(index=ES_INDEX)["count"],
    }

@app.get("/search")
def search(q: str = "", day: str | None = None, topic: str | None = None,
           registration: str | None = None, wheelchair: bool = False,
           audience: str | None = None, venue: str | None = None,
           level: str | None = None, room: list[str] | None = Query(None)):
    """
    Hybrid search + filters. Returns matching talks and venue/level/room counts for the heatmap.
    venue/level/room let the floor plan ask for one place, e.g. ?venue=Salt Palace&room=250
    (room can repeat: &room=Solutions Showcase | Hall 1&room=Halls A-C)
    """
    filters = build_filters(day, topic, registration, wheelchair, audience, venue, level, room)
    query = build_query(q, filters)

    knn = None
    if q.strip():
        try:
            vector = ai.embeddings.create(model="text-embedding-3-small", input=q).data[0].embedding
            knn = {
                "field": "embedding",
                "query_vector": vector,
                "k": 10,
                "num_candidates": 100,
                "boost": 10,
                "filter": filters,   # semantic results must respect the dropdowns too
            }
        except Exception:
            knn = None  # OpenAI unavailable → keyword only

    resp = es.search(
        index=ES_INDEX,
        query=query,
        knn=knn,
        aggs=AGGS,
        sort=None if q.strip() else [{"start": "asc"}],  # no text → time order
        size=50,
        source_excludes=["embedding"],
    )

    return {
        "total": resp["hits"]["total"]["value"],
        "talks": [hit["_source"] for hit in resp["hits"]["hits"]],
        "venues": parse_aggs(resp["aggregations"]),
    }


# Serve the frontend (static/index.html at http://localhost:8000/).
# Must be LAST: a mount at "/" would otherwise catch /search and /health.
app.mount("/", StaticFiles(directory="static", html=True), name="static")

