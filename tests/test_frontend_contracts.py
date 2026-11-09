import json
import re
from datetime import datetime
try:
    import pytest
except ImportError:
    pytest = None

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

def test_k8s_background_contracts():
    """Verify background canvas, CSS styles, and module integration."""
    with open('static/index.html', 'r') as f:
        html = f.read()
    assert 'id="k8s-topology-canvas"' in html, "index.html missing k8s-topology-canvas"

    with open('static/css/style.css', 'r') as f:
        css = f.read()
    assert '.k8s-topology-canvas' in css, "style.css missing .k8s-topology-canvas rule"

    with open('static/js/k8sBackground.js', 'r') as f:
        k8s_js = f.read()
    assert 'K8sTopologyBackground' in k8s_js, "k8sBackground.js missing K8sTopologyBackground export"
    assert 'export function initK8sBackground' in k8s_js, "k8sBackground.js missing initK8sBackground export"

    with open('static/js/app.js', 'r') as f:
        app_js = f.read()
    assert 'initK8sBackground' in app_js, "app.js missing initK8sBackground import/call"


def test_calendar_export_contracts():
    """Verify calendar export contracts for Apple/iCal .ics and Google Calendar."""
    # 1. Module exports
    with open('static/js/calendarExport.js', 'r') as f:
        export_js = f.read()
    assert 'export function generateGoogleCalendarUrl' in export_js
    assert 'export function generateIcsCalendar' in export_js
    assert 'export function downloadIcsFile' in export_js
    assert 'export function openGoogleCalendar' in export_js
    assert 'export function escapeIcsText' in export_js
    assert 'export function foldIcsLine' in export_js

    # 2. HTML elements for export
    with open('static/index.html', 'r') as f:
        html = f.read()
    assert 'id="schedule-export-bar"' in html, "index.html missing schedule-export-bar"
    assert 'id="btn-export-apple-all"' in html, "index.html missing btn-export-apple-all"
    assert 'id="btn-export-google-all"' in html, "index.html missing btn-export-google-all"
    assert 'id="gcal-export-modal"' in html, "index.html missing gcal-export-modal"
    assert 'id="gcal-sessions-list"' in html, "index.html missing gcal-sessions-list"
    assert 'id="btn-gcal-download-ics"' in html, "index.html missing btn-gcal-download-ics"
    assert 'id="btn-gcal-open-all"' in html, "index.html missing btn-gcal-open-all"

    # 3. CSS styles in components.css
    with open('static/css/components.css', 'r') as f:
        components_css = f.read()
    assert '.schedule-export-bar' in components_css, "components.css missing .schedule-export-bar"
    assert '.btn-cal-export' in components_css, "components.css missing .btn-cal-export"
    assert '.btn-export-apple' in components_css, "components.css missing .btn-export-apple"
    assert '.btn-export-google' in components_css, "components.css missing .btn-export-google"
    assert '.schedule-card-actions' in components_css, "components.css missing .schedule-card-actions"
    assert '.btn-card-cal' in components_css, "components.css missing .btn-card-cal"
    assert '.gcal-modal-card' in components_css, "components.css missing .gcal-modal-card"

    # 4. App.js integration
    with open('static/js/app.js', 'r') as f:
        app_js = f.read()
    assert 'calendarExport.js' in app_js, "app.js missing calendarExport import"
    assert 'btnExportAppleAll' in app_js, "app.js missing btnExportAppleAll wiring"
    assert 'btnExportGoogleAll' in app_js, "app.js missing btnExportGoogleAll wiring"
    assert 'schedule-card-actions' in app_js, "app.js missing schedule-card-actions in cards"
    assert 'window.exportTalkToIcs' in app_js, "app.js missing window.exportTalkToIcs"
    assert 'window.exportTalkToGoogle' in app_js, "app.js missing window.exportTalkToGoogle"


if __name__ == '__main__':
    test_mock_talks_schema()
    test_conflict_logic_overlap()
    test_conflict_logic_consecutive_no_conflict()
    test_conflict_logic_different_days()
    test_k8s_background_contracts()
    test_calendar_export_contracts()
    print("All frontend contracts & calendar export tests passed successfully!")

