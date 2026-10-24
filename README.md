# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This project has two parts: a small API client that proves the front end can talk to an API (using the JSONPlaceholder practice API), and design documents for the real backend.

## How to run the API client

1. Clone the repository: `git clone https://github.com/iminyibrooks-bot/quicknotes-system-design.git`
2. Open the folder and start a local server: `python3 -m http.server 8000`
3. Visit `http://localhost:8000`, click **Load notes**, add a note with the form, and delete a note.

The client loads 10 notes (GET), creates notes (POST) and deletes notes (DELETE), with loading, success, error and empty states. JSONPlaceholder does not store new notes, so notes created in the page are removed locally when deleted.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- `fetch` does not throw on a 404 or 500 response, so a reusable `request()` function must check `response.ok` and throw its own error.
- `try / catch / finally` lets me show an error message and always re-enable the buttons, so the page never gets stuck in a loading state.
- A practice API like JSONPlaceholder fakes writes, so the client has to be honest about what was and was not really deleted.
- A read-heavy system is designed around reads: a CDN, a cache and a read replica take load off the primary database.
- A join table is needed for a many-to-many relationship, like notes and tags, because a single column cannot hold a list of ids.
