# QuickNotes Data Model

## Entities

### users
| Column | Type | Notes |
|---|---|---|
| id | BIGINT | primary key |
| name | VARCHAR(100) | required |
| email | VARCHAR(255) | required, unique |
| password_hash | VARCHAR(255) | required |
| created_at | TIMESTAMP | default now |

### notes
| Column | Type | Notes |
|---|---|---|
| id | BIGINT | primary key |
| user_id | BIGINT | foreign key to users(id) |
| title | VARCHAR(100) | required |
| body | TEXT | optional |
| created_at | TIMESTAMP | default now |
| updated_at | TIMESTAMP | default now |

### tags
| Column | Type | Notes |
|---|---|---|
| id | BIGINT | primary key |
| user_id | BIGINT | foreign key to users(id) |
| name | VARCHAR(50) | required, unique per user |

### note_tags (join table)
| Column | Type | Notes |
|---|---|---|
| note_id | BIGINT | foreign key to notes(id) |
| tag_id | BIGINT | foreign key to tags(id) |

Primary key: (note_id, tag_id).

## Relationships

- **One-to-many:** one user has many notes, and one user has many tags. Each note and each tag belongs to exactly one user.
- **Many-to-many:** a note can have many tags and a tag can be on many notes. A single column cannot hold a list of ids, so the `note_tags` join table stores one row per note-and-tag pair. The composite primary key stops the same tag being added to the same note twice.

## CREATE TABLE statements (PostgreSQL)

```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

## Example queries

The latest 10 notes for one user:

```sql
SELECT id, title, created_at
FROM notes
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 10;
```

All of one user's notes with a given tag (uses JOINs):

```sql
SELECT n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t ON t.id = nt.tag_id
WHERE n.user_id = 42 AND t.name = 'study';
```

How many notes each tag has:

```sql
SELECT t.name, COUNT(*) AS note_count
FROM tags t
JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 42
GROUP BY t.name
ORDER BY note_count DESC;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id);
```

- `idx_notes_user_created`: almost every request is "this user's newest notes". Without this index the database would scan the whole notes table, which gets slow at millions of rows. With it, the database jumps straight to one user's notes already in order.
- `idx_note_tags_tag`: the primary key already covers lookups starting from a note, but "all notes with this tag" starts from the tag, so it needs its own index.

## SQL or NoSQL?

I would choose SQL. QuickNotes data is clearly structured and relational: users own notes, and notes and tags are linked many-to-many. SQL enforces that with foreign keys, unique emails and transactions, so a note can never point at a missing user and tags stay consistent. Queries like "notes with this tag" need joins, which SQL does well. The expected load of about 7 writes per second on average is small enough for one primary database with read replicas, so we do not need the horizontal scaling that NoSQL is best at. A NoSQL store, such as a search engine or document database, could be added later for full-text search.
