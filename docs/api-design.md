# QuickNotes API Design

Base URL: `https://api.quicknotes.example/v1`. All requests and responses use JSON. After logging in, clients send `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/auth/login` | Log in with email and password and receive a token | 200 OK |
| GET | `/notes` | List the current user's notes (supports `?page=`, `?limit=` and `?tag=`) | 200 OK |
| GET | `/notes/{id}` | Get one note | 200 OK |
| POST | `/notes` | Create a note | 201 Created |
| PUT | `/notes/{id}` | Replace a note's title, body and tags | 200 OK |
| DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| GET | `/tags` | List the current user's tags | 200 OK |

## Create a note

`POST /notes`

Request:

```json
{
  "title": "Buy milk",
  "body": "Two litres and bread",
  "tags": ["personal"]
}
```

Response, `201 Created`:

```json
{
  "id": 101,
  "title": "Buy milk",
  "body": "Two litres and bread",
  "tags": ["personal"],
  "createdAt": "2026-10-28T09:30:00Z"
}
```

## List notes

`GET /notes?limit=2&page=1`

Response, `200 OK`:

```json
{
  "page": 1,
  "limit": 2,
  "total": 37,
  "notes": [
    { "id": 101, "title": "Buy milk", "body": "Two litres and bread", "tags": ["personal"], "createdAt": "2026-10-28T09:30:00Z" },
    { "id": 100, "title": "Revise SQL", "body": "Joins and indexes", "tags": ["study"], "createdAt": "2026-10-27T18:05:00Z" }
  ]
}
```

## Error codes

| Status | Meaning | Example |
|---|---|---|
| 400 Bad Request | The request is invalid | `POST /notes` with no title, or a title over 100 characters |
| 401 Unauthorized | No valid token | `GET /notes` with a missing or expired token |
| 403 Forbidden | Logged in, but not allowed | `DELETE /notes/55` where note 55 belongs to another user |
| 404 Not Found | The resource does not exist | `GET /notes/9999` when no note has that id |
| 500 Internal Server Error | Something broke on the server | The database is unreachable during `POST /notes` |

Example error body (400):

```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "title is required and must be 100 characters or fewer"
  }
}
```
