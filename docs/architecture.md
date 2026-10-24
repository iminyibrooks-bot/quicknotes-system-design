# QuickNotes Architecture

## Requirements

### Functional
- Users can sign up and log in.
- Users can create, view, edit and delete their own notes.
- Users can tag notes and filter by tag.
- Users can search their notes.

### Non-functional
- **Availability:** about 99.9% uptime, with no single point of failure.
- **Latency:** listing notes should take under 300 ms for most requests.
- **Scalability:** supports 1 million users and can grow further by adding servers.
- **Durability:** no note is lost, using replication and backups.
- **Security:** HTTPS, hashed passwords, and users can only see their own notes.

## Load estimate for 1 million users

Assumptions: 1,000,000 registered users, 20% active daily (200,000), each active user views their notes 20 times a day and creates or edits 3 notes a day. Peak is 5 times the average. An average note, with metadata, is about 1 KB. A day has 86,400 seconds.

| Measure | Working | Result |
|---|---|---|
| Reads per day | 200,000 x 20 | 4,000,000 |
| Reads per second (average) | 4,000,000 / 86,400 | about 46 |
| Reads per second (peak) | 46 x 5 | about 231 |
| Writes per day | 200,000 x 3 | 600,000 |
| Writes per second (average) | 600,000 / 86,400 | about 7 |
| Writes per second (peak) | 7 x 5 | about 35 |
| Storage per year | 600,000 x 1 KB x 365 | about 219 GB |

The system is **read-heavy** (about 7 reads for every write). The note data is about 220 GB a year, and with indexes and a replica we should plan for roughly 1 TB a year of disk.

## Architecture diagram

```
               Client (browser or app)
                          |
                          v
                        DNS  (finds the API's address)
                          |
                          v
                        CDN  (serves HTML, CSS and JS files)
                          |
                          v
                 +-----------------+
                 |  Load balancer  |
                 +--------+--------+
                          |
            +-------------+-------------+
            v                           v
      +------------+              +------------+
      | App server |              | App server |   (add more as traffic grows)
      +-----+------+              +------+-----+
            |                            |
            +-------------+--------------+
                          |
       +------------+-----+------+------------------+
       |            |            |                  |
       v            v            v                  v
   +-------+   +----------+  +-------+        +-----------+
   | Cache |   | Primary  |  | Queue |------->|  Worker   |
   |       |   | database |  |       |        | (search   |
   +-------+   +----+-----+  +-------+        | indexing, |
                    |                         | reminders)|
             replicates                       +-----------+
                    |
                    v
             +--------------+
             | Read replica |
             +--------------+
```

## Components

- **Client:** it is the browser or app the user touches, and it sends requests to the API and shows the results.
- **DNS:** it solves the problem of finding the service by turning the API's name into the address of our load balancer.
- **CDN:** it solves slow loading of static files by serving the HTML, CSS and JavaScript from locations close to the user.
- **Load balancer:** it solves the problem of one server being overloaded or failing by spreading requests across several app servers and skipping any that are down.
- **App servers:** they run the API logic, and because they keep no user state we can add more of them as traffic grows.
- **Cache:** it solves repeated slow database reads by keeping recent note lists in fast memory.
- **Primary database:** it solves safe, consistent storage of users, notes and tags, and it handles all writes.
- **Read replica:** it solves read load on the primary by holding a copy of the data that serves most read queries.
- **Queue:** it solves slow requests by letting the app server hand off slow jobs, like search indexing, and reply to the user straight away.
- **Worker:** it solves the problem of heavy background work by taking jobs from the queue and doing them away from the user's request.

## Request flows

### GET /notes
1. The client sends `GET /notes` with its token, and DNS finds the load balancer.
2. The load balancer sends the request to a healthy app server.
3. The app server checks the token and works out the user.
4. It looks in the cache for that user's note list.
5. On a hit, it returns the cached list. On a miss, it reads from the read replica, stores the result in the cache and returns it.
6. The app server replies `200 OK` with the JSON list.

### POST /notes
1. The client sends `POST /notes` with its token and JSON body.
2. The load balancer sends it to an app server, which checks the token.
3. The app server validates the title (required, 100 characters at most).
4. It writes the note to the primary database.
5. It clears that user's cached note list, so the next read is fresh.
6. It puts a "re-index this note for search" job on the queue.
7. It replies `201 Created` with the new note, without waiting for the worker.
8. A worker takes the job from the queue and updates the search index.

## Trade-offs

1. **Caching is fast but can be stale.** A cached list may be slightly out of date, which we reduce by clearing the cache on every write and using short cache times. The cost is more database reads after each write.
2. **Read replicas scale reads but lag behind the primary.** A user might not see a note they just created if their next read hits a replica that has not caught up. We accept this for scalability, and read a user's own latest notes from the primary or the cache.
3. **A queue keeps requests fast but makes search eventually consistent.** A new note may take a few seconds to appear in search results, and the queue is one more component to run and monitor.
4. **SQL gives strong consistency but scales writes vertically.** One primary handles our 35 writes per second easily, but if writes grew a hundredfold we would need sharding.

## Avoiding single points of failure

- **Load balancer:** run it as a managed or paired service, so one failing does not take the service down.
- **App servers:** run two or more in different zones, and the load balancer stops sending traffic to a failed one.
- **Database:** the primary replicates to a replica, and if the primary fails the replica is promoted. Automatic backups protect against data loss.
- **Cache:** run it as a replicated cluster, and if it fails the app falls back to the database, only more slowly.
- **Queue and worker:** the queue stores jobs durably and several workers run at once, so a failed worker's job is retried.
- **DNS and CDN:** use providers with several servers, so one outage does not stop the service.
