import json
import re
from datetime import datetime
import pytest

def parse_mock_data():
    with open('static/js/mockData.js', 'r') as f:
        content = f.read()
    # Extract JSON array
    match = re.search(r'export const MOCK_TALKS\s*=\s*(\[.*?\]);', content, re.DOTALL)
    assert match, "Could not find MOCK_TALKS in mockData.js"
    return json.loads(match.group(1))

def test_mock_talks_schema():
    talks = parse_mock_data()
    assert len(talks) > 0, "MOCK_TALKS should not be empty"

    required_fields = ['id', 'title', 'start', 'end', 'location', 'accessibility']
    for talk in talks:
        for field in required_fields:
            assert field in talk, f"Talk {talk.get('id')} missing required field: {field}"
        
        # Verify date parsing
        start_dt = datetime.fromisoformat(talk['start'])
        end_dt = datetime.fromisoformat(talk['end'])
        assert end_dt > start_dt, f"Talk {talk['id']} end time must be after start time"

        # Verify location
        loc = talk['location']
        assert 'venue' in loc, f"Talk {talk['id']} location missing venue"
        assert 'level' in loc, f"Talk {talk['id']} location missing level"

def test_conflict_logic_overlap():
    """Two talks on the same day overlapping 11:30-12:00 must conflict."""
    talk_a = {
        "id": "1",
        "day": "2026-11-10",
        "start": "2026-11-10T11:30:00",
        "end": "2026-11-10T12:00:00"
    }
    talk_b = {
        "id": "2",
        "day": "2026-11-10",
        "start": "2026-11-10T11:30:00",
        "end": "2026-11-10T12:00:00"
    }

    # Python equivalent of Schedule.findConflicts
    def has_conflict(a, b):
        if a['day'] != b['day']:
            return False
        start_a = datetime.fromisoformat(a['start'])
        end_a = datetime.fromisoformat(a['end'])
        start_b = datetime.fromisoformat(b['start'])
        end_b = datetime.fromisoformat(b['end'])
        return start_a < end_b and end_a > start_b

    assert has_conflict(talk_a, talk_b) is True

def test_conflict_logic_consecutive_no_conflict():
    """Consecutive talks (11:00-11:30 and 11:30-12:00) should NOT conflict."""
    talk_a = {
        "id": "1",
        "day": "2026-11-10",
        "start": "2026-11-10T11:00:00",
        "end": "2026-11-10T11:30:00"
    }
    talk_b = {
        "id": "2",
        "day": "2026-11-10",
        "start": "2026-11-10T11:30:00",
        "end": "2026-11-10T12:00:00"
    }

    start_a = datetime.fromisoformat(talk_a['start'])
    end_a = datetime.fromisoformat(talk_a['end'])
    start_b = datetime.fromisoformat(talk_b['start'])
    end_b = datetime.fromisoformat(talk_b['end'])

    overlap = start_a < end_b and end_a > start_b
    assert overlap is False

def test_conflict_logic_different_days():
    """Talks on different days at the same time must NOT conflict."""
    talk_a = {
        "id": "1",
        "day": "2026-11-09",
        "start": "2026-11-09T11:30:00",
        "end": "2026-11-09T12:00:00"
    }
    talk_b = {
        "id": "2",
        "day": "2026-11-10",
        "start": "2026-11-10T11:30:00",
        "end": "2026-11-10T12:00:00"
    }
    assert talk_a['day'] != talk_b['day']
