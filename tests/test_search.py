"""Unit tests for app/search.py: query building and aggregation parsing.
These don't call Elasticsearch or OpenAI, so they run anywhere (including CI)."""

from app.search import AGGS, build_filters, build_query, parse_aggs


# ---------- build_filters ----------

def test_no_filters_when_nothing_picked():
    assert build_filters() == []


def test_wheelchair_off_adds_no_filter():
    assert build_filters(wheelchair=False) == []


def test_wheelchair_on_requires_accessible_venue():
    assert {"term": {"accessibility.wheelchair_accessible": True}} in build_filters(wheelchair=True)


def test_day_filter():
    assert {"term": {"day": "2026-11-10"}} in build_filters(day="2026-11-10")


def test_registration_filter():
    assert {"term": {"registration.type": "all_access"}} in build_filters(registration="all_access")


def test_audience_filter():
    assert {"term": {"audience_level": "Beginner"}} in build_filters(audience="Beginner")


def test_topic_matches_official_or_inferred():
    topic_filter = build_filters(topic="Security")[0]
    should = topic_filter["bool"]["should"]
    assert {"term": {"topics": "Security"}} in should
    assert {"term": {"topics_inferred": "Security"}} in should
    assert topic_filter["bool"]["minimum_should_match"] == 1


def test_all_filters_combine():
    filters = build_filters(day="2026-11-10", topic="Security", registration="kubecon_pass",
                            wheelchair=True, audience="Beginner")
    assert len(filters) == 5


def test_venue_and_level_filters():
    filters = build_filters(venue="Salt Palace", level="Level 2")
    assert {"term": {"location.venue": "Salt Palace"}} in filters
    assert {"term": {"location.level": "Level 2"}} in filters


def test_room_uses_prefix_so_svg_ids_match_all_sections():
    # SVG room "250" must match data rooms "250 A-C" and "250 D-F"
    assert {"prefix": {"location.room": "250"}} in build_filters(room="250")


def test_empty_strings_are_ignored():
    # the frontend may send "" for "any"
    assert build_filters(day="", topic="", registration="", audience="") == []


# ---------- build_query ----------

def test_blank_query_has_no_text_clause():
    assert build_query("   ", [])["bool"]["must"] == []


def test_text_query_uses_fuzzy_multi_match():
    match = build_query("observabilty", [])["bool"]["must"][0]["multi_match"]
    assert match["query"] == "observabilty"
    assert match["fuzziness"] == "AUTO"
    assert "title^3" in match["fields"]


def test_filters_are_passed_into_query():
    filters = build_filters(day="2026-11-10")
    assert build_query("security", filters)["bool"]["filter"] == filters


# ---------- AGGS ----------

def test_aggs_nest_venue_level_room():
    venues = AGGS["venues"]
    assert venues["terms"]["field"] == "location.venue"
    levels = venues["aggs"]["levels"]
    assert levels["terms"]["field"] == "location.level"
    assert levels["aggs"]["rooms"]["terms"]["field"] == "location.room"


# ---------- parse_aggs ----------

def test_parse_aggs_shape():
    fake = {"venues": {"buckets": [
        {"key": "Salt Palace", "doc_count": 2, "levels": {"buckets": [
            {"key": "Level 2", "doc_count": 2, "rooms": {"buckets": [
                {"key": "255 BC", "doc_count": 2},
            ]}},
        ]}},
    ]}}
    assert parse_aggs(fake) == [
        {"key": "Salt Palace", "count": 2, "levels": [
            {"key": "Level 2", "count": 2, "rooms": [{"key": "255 BC", "count": 2}]},
        ]},
    ]


def test_parse_aggs_empty():
    assert parse_aggs({"venues": {"buckets": []}}) == []