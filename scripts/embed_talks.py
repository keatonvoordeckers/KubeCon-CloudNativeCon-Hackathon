import os

from elasticsearch import Elasticsearch
from elasticsearch import helpers
from openai import OpenAI

es = Elasticsearch(os.environ["ES_URL"])
INDEX = os.environ["ES_INDEX"]
ai = OpenAI()

# Read every talk's id and text
docs = [(h["_id"], h["_source"]["title"] + "\n" + (h["_source"].get("abstract") or "")[:2000])
    for h in helpers.scan(es, index=INDEX, _source=["title", "abstract"])] # Reads all 582

# Embed in batches of 100 and write the vectors back
for i in range(0, len(docs), 100):
    batch = docs[i:i + 100]
    resp = ai.embeddings.create(model="text-embedding-3-small", input=[text for _, text in batch])
    actions = [{"_op_type": "update", "_index": INDEX, "_id": doc_id, "doc": {"embedding": item.embedding}}
               for (doc_id, _), item in zip(batch, resp.data)]
    helpers.bulk(es, actions)
    print(f"embedded {i + len(batch)}/{len(docs)}")

