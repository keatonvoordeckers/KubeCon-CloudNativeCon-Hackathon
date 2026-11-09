def build_filters(day=None, topic=None, registration=None, wheelchair=False, audience=None,
                  venue=None, level=None, room=None):
    """Turn dropdown/checkbox choices into a list of Elasticsearch filter clauses.
    Only add a filter when the user actually picked something.
    venue/level/room narrow results to a place on the map (e.g. a clicked SVG room)."""
    filters = []
    if day:
        filters.append({"term": {"day": day}})
    if topic:
        # official track OR keyword-inferred topic
        filters.append({"bool": {
            "should": [{"term": {"topics": topic}}, {"term": {"topics_inferred": topic}}],
            "minimum_should_match": 1,
        }})
    if registration:
        filters.append({"term": {"registration.type": registration}})
    if wheelchair:
        filters.append({"term": {"accessibility.wheelchair_accessible": True}})
    if audience:
        filters.append({"term": {"audience_level": audience}})
    if venue:
        filters.append({"term": {"location.venue": venue}})
    if level:
        filters.append({"term": {"location.level": level}})
    if room:
        # The SVG floor plan uses short ids like "250"; the data has "250 A-C" and "250 D-F".
        # A prefix match covers every section of that room. A list means "any of these"
        # (e.g. Hall 1 = "Solutions Showcase | Hall 1" or the whole-floor "Halls A-C, Halls 1-5").
        prefixes = [r for r in ([room] if isinstance(room, str) else room) if r]
        if len(prefixes) == 1:
            filters.append({"prefix": {"location.room": prefixes[0]}})
        elif prefixes:
            filters.append({"bool": {
                "should": [{"prefix": {"location.room": r}} for r in prefixes],
                "minimum_should_match": 1,
            }})
    return filters


def build_query(q, filters):
    """Keyword part of hybrid search, restricted by the filters."""
    must = []
    if q.strip():
        must.append({"multi_match": {
            "query": q,
            "fields": ["title^3", "abstract", "speakers.name"],
            "fuzziness": "AUTO",
            "minimum_should_match": "50%",
        }})
    return {"bool": {"must": must, "filter": filters}}


# Heatmap counts: venue → level → room
AGGS = {
    "venues": {
        "terms": {"field": "location.venue", "size": 20},
        "aggs": {
            "levels": {
                "terms": {"field": "location.level", "size": 10},
                "aggs": {"rooms": {"terms": {"field": "location.room", "size": 50}}},
            }
        },
    }
}


def parse_aggs(aggregations):
    """Turn Elasticsearch's nested buckets into the simple shape the frontend uses."""
    return [
        {
            "key": v["key"],
            "count": v["doc_count"],
            "levels": [
                {
                    "key": l["key"],
                    "count": l["doc_count"],
                    "rooms": [{"key": r["key"], "count": r["doc_count"]} for r in l["rooms"]["buckets"]],
                }
                for l in v["levels"]["buckets"]
            ],
        }
        for v in aggregations["venues"]["buckets"]
    ]