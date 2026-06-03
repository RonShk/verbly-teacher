# Student overview API (frontend)

Loads the student **Overview** tab: header, today’s vocab / production / translation, and vocab health.

## Request

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/students/{studentUid}/overview` |
| **Auth** | `Authorization: Bearer <Firebase ID token>` (signed-in tutor) |
| **Query** | `timezoneOffsetMinutes` (optional) — use `-(new Date().getTimezoneOffset())` in the browser so “today” matches the tutor’s local day. |

`studentUid` comes from the student page route or the students table (`uid`).

Types: `src/types/student-overview.ts` (`StudentOverviewResponse`).

## Errors

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid token |
| `403` | Student not on tutor roster |
| `400` | Missing `studentUid` |

## Example response

Paste a real `200` body below after testing:

```json

{
    "student": {
        "uid": "40orwbMb1DdMR1yJ2ryPisctQT52",
        "name": "Ron Shaked",
        "email": "ronshaked07@gmail.com",
        "linkedAt": "2026-05-26T18:08:19.000Z",
        "lastActiveAt": "2026-06-03T17:35:56.553Z",
        "vocabTotal": 1489
    },
    "today": {
        "vocab": {
            "status": "not_started",
            "reviewedCount": 0
        },
        "production": {
            "status": "in_progress",
            "completedCount": 1,
            "totalCount": 10,
            "scorePercent": 95
        },
        "translation": {
            "status": "in_progress",
            "completedCount": 2,
            "totalCount": 10,
            "scorePercent": 100
        }
    },
    "vocabHealth": {
        "new": 0,
        "learning": 0,
        "review": 1489,
        "relearning": 0,
        "total": 1489
    }
}


```
