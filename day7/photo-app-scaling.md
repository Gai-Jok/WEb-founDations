# Scaling Plan: SnapShare

## Assumptions

- 10,000,000 registered users.
- 10% are active on a given day → **1,000,000 daily active users (DAU)**.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- An average photo is 2 MB; each photo also gets a 50 KB thumbnail.
- 1 day ≈ 100,000 seconds (rounded, for easy back-of-the-envelope maths).
- Peak traffic is about 5× the daily average (busy hours).

## Load estimates

**Uploads (writes):**
- 1,000,000 DAU × 1 upload/day = **1,000,000 uploads per day**
- 1,000,000 ÷ 100,000 ≈ **10 uploads/second (average)**
- Peak (×5): **≈ 50 uploads/second**

**Feed views (reads):**
- 1,000,000 DAU × 50 views/day = **50,000,000 feed views per day**
- 50,000,000 ÷ 100,000 = **500 feed views/second (average)**
- Peak (×5): **≈ 2,500 feed views/second**

**Photo storage per year:**
- Original photos: 1,000,000/day × 2 MB = 2,000,000 MB/day = 2,000 GB/day → × 365 ≈ **730,000 GB (≈ 730 TB) per year**
- Thumbnails: 1,000,000/day × 50 KB = 50,000 MB/day = 50 GB/day → × 365 ≈ **18,250 GB (≈ 18.25 TB) per year**
- **Total: ≈ 748,250 GB, or roughly 750 TB per year**

## Read-heavy or write-heavy?

SnapShare is **heavily read-heavy**: there are 50 feed views for every 1 upload (500 reads/sec vs. 10 writes/sec at average load — a 50:1 ratio, even more read-skewed than the QuickNotes example from the lesson). This means:

- **Caching pays off enormously.** Since so few requests are writes, a cache can absorb the vast majority of feed traffic without going stale too often.
- **Read replicas matter a lot**, so read traffic doesn't compete with the (comparatively rare) writes on the primary database.
- **A CDN is essential**, since the feed is mostly made of static image files that are viewed far more often than they're uploaded — serving them from an edge location close to each user matters more here than it would for a write-heavy system.

## Why photos shouldn't live in the database

A relational database is built for structured, relatively small rows and for being queried, joined and indexed efficiently — not for storing large binary files. Putting 2 MB photo files directly into database rows would:

- bloat the database's size dramatically (hundreds of terabytes, as calculated above), making backups, replication and queries far slower;
- waste the database's memory cache on raw image bytes instead of the metadata and indexes that make queries fast;
- be far more expensive per gigabyte than dedicated file storage.

Instead, photos and thumbnails should be stored in **object storage** (e.g. Amazon S3), which is purpose-built for storing huge numbers of large files cheaply and reliably. The database then stores only a small row of **metadata** per photo — the uploader's user id, a timestamp, and a URL/key pointing to the file in object storage — which keeps the database small, fast, and focused on what it's good at.

## Architecture diagram

```
                                     ┌─────────┐
                        ┌───────────>│   DNS   │  (snapshare.com -> IP)
                        │            └─────────┘
┌────────────────┐ static files  ┌─────────────────────────┐
│ Browser/mobile  │──────────────>│  CDN (HTML, CSS, JS,    │
│ client          │               │  cached feed images)    │
└────────┬────────┘               └─────────────────────────┘
         │ API calls (HTTPS/JSON)
         v
  ┌───────────────┐
  │ Load balancer  │
  └───────┬────────┘
          │
   ┌──────┼──────┐
   v      v      v
┌───────┐ ┌───────┐ ┌───────┐
│ App 1 │ │ App 2 │ │ App 3 │──────────────> ┌───────────────┐
└───┬───┘ └───┬───┘ └───┬───┘                │ Cache (Redis) │
    │         │         │                    └───────────────┘
    │  writes │ reads   │ upload original photo
    v         v         v
┌─────────┐ ┌───────────┐          ┌───────────────────┐
│ Primary │>│ Read      │          │  Object storage    │
│   DB    │ │ replicas  │          │  (original photos  │
└────┬────┘ └───────────┘          │  + thumbnails)     │
     │                             └─────────▲──────────┘
     │ "create thumbnail" job                │
     v                                       │
 ┌───────┐        ┌────────┐ generates thumbnail,
 │ Queue │───────>│ Worker │──────────────────┘
 └───────┘        └────────┘ saves it to object storage,
                              updates DB row
```

## Explaining each component (one sentence each)

- **DNS** translates `snapshare.com` into the IP address of our CDN/load balancer, so the user's device knows where to connect.
- **CDN** serves the static front end and cached feed images from a server physically close to the user, which matters enormously here since reads so heavily outnumber writes.
- **Load balancer** spreads incoming API requests across several app servers and stops sending traffic to any server that fails its health check, removing a single point of failure.
- **App servers (2 or more)** are stateless servers that handle uploads and feed requests, and can be added horizontally as the user base grows.
- **Cache (Redis)** stores recently viewed feed data in memory so the huge volume of feed-view traffic doesn't have to hit the database on every request.
- **Primary database** stores structured metadata (users, photo records, follow relationships) and is the only place that accepts writes.
- **Read replicas** are copies of the primary database that serve the much heavier read traffic from feed views, without slowing down the (much rarer) writes on the primary.
- **Object storage** stores the actual photo and thumbnail files, which are far too large and unstructured to belong inside the relational database.
- **Queue** holds "create thumbnail" jobs so the app server can respond to the user immediately instead of waiting for image processing to finish.
- **Worker** pulls jobs off the queue and does the slow work — resizing the photo into a thumbnail and saving it — in the background.

## Upload flow, step by step

1. The user selects a photo in the app and taps "Upload."
2. The request reaches the load balancer, which forwards it to a healthy app server.
3. The app server uploads the original 2 MB photo directly to object storage and receives back a URL/key for it.
4. The app server writes a new row to the primary database containing the photo's metadata (user id, the object storage URL, a timestamp, and a "thumbnail pending" flag).
5. The app server adds a "create thumbnail for photo X" job to the queue.
6. The app server immediately responds to the user with success ("Photo uploaded!") — it does **not** wait for the thumbnail to be generated.
7. A worker picks up the job from the queue, fetches the original photo from object storage, and resizes it down to the 50 KB thumbnail.
8. The worker uploads the thumbnail to object storage and updates the photo's row in the database with the thumbnail's URL (and clears the "pending" flag).
9. From this point on, anyone whose feed shows this photo will see the generated thumbnail; any feed request that briefly lands between steps 6 and 8 would show a placeholder or the full-size image until the thumbnail is ready.

## Trade-offs

1. **Speed versus freshness.** Caching feed data in Redis makes feed views extremely fast and takes enormous load off the database, but it means a user's feed can be a few seconds out of date — a brand-new photo from someone they follow might not appear instantly until the cache entry expires or is invalidated. For a photo feed (unlike, say, a bank balance), this small delay is an acceptable trade for the huge performance win.
2. **Simplicity versus scalability.** Processing thumbnails asynchronously through a queue and worker adds an extra moving part to build, deploy and monitor, compared to just generating the thumbnail inline during the upload request. The payoff is that uploads stay fast for the user and a sudden burst of uploads doesn't overload the app servers — the work simply queues up and the workers catch up over time.
3. **Cost versus reliability.** Running multiple app servers, a read replica, and separate worker servers costs more to operate than a single server, but it removes single points of failure: if one app server or the primary database's replica goes down, the system keeps serving most users rather than going fully offline.