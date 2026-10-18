# TicketHub: System Design

TicketHub is a website that sells tickets for concerts and events. This document
follows the six-part design framework: requirements, estimates, API, data model,
architecture, and trade-offs.

## 1. Requirements

### Functional requirements

- Users can browse upcoming events and view an event's details.
- Users can view a seating chart showing which seats are available, held, or sold.
- Users can temporarily **hold** one or more specific seats while they complete payment.
- Users can **pay** for held seats, which converts the hold into a confirmed order and tickets.
- Users can view the tickets they've purchased.

### Non-functional requirements

- **Correctness (the most important one):** a seat must never be sold to two different people. This holds true no matter how many people try to buy it at the exact same instant.
- **Fairness:** when far more people want seats than exist, the system should give everyone who arrived in time a genuine chance, rather than silently favoring whoever has the fastest internet connection or a purchasing bot.
- **Speed:** browsing events and seat maps should respond in well under 1 second under normal load.
- **Availability under extreme, short-lived spikes:** the system must stay up and responsive during a popular on-sale event, which is exactly the highest-value, highest-visibility moment for the business.
- **Scalability:** the system must absorb a demand spike roughly 65× its normal peak load (see estimates below) without falling over.

## 2. Estimates

**Assumptions:** 2,000,000 registered users; 1 day ≈ 100,000 seconds; peak traffic is ~5× the daily average (for normal days).

### Normal traffic

- 50,000 visitors/day × 10 page views each = **500,000 page views/day**
  → 500,000 ÷ 100,000 = **5 reads/second (average)**, **≈ 25 reads/second (peak)**
- 5,000 tickets sold/day → 5,000 ÷ 100,000 = **0.05 writes/second (average)**, **≈ 0.25 writes/second (peak)**

On a normal day, TicketHub is extremely read-heavy and very low-traffic overall — a single well-configured server could handle this comfortably.

### The "big sale" peak

When a popular concert goes on sale: 200,000 people try to buy its 20,000 seats within the first 10 minutes (600 seconds).

- **Raw purchase attempts:** 200,000 ÷ 600 ≈ **333 attempts/second**
- **Successful sales are capped by supply:** only 20,000 seats exist, so at most 20,000 ÷ 600 ≈ **33 sales/second** can actually succeed — the other **180,000 people (90% of attempts) will be told the seat is gone.**
- **Total requests during the rush:** each person doesn't just submit one purchase — they view the event page, load the seat map, maybe refresh it, attempt a hold, and attempt payment. Assuming about 5 requests per person during the 10-minute window: 200,000 × 5 = 1,000,000 requests ÷ 600 seconds ≈ **1,667 requests/second.**

### Comparing the two

**1,667 requests/second during the big sale is about 65× the normal day's peak of 25 requests/second** — and that entire spike is concentrated on a single event's seat map and purchase endpoints, within a 10-minute window. This is the classic "flash sale" problem: generic horizontal scaling helps, but the real challenges are (a) making sure the flood of simultaneous purchase attempts never double-sells a seat, and (b) handling the fact that 90% of eager buyers must be told "sold out" without the system buckling under their attempts.

## 3. API design

| Method | Path | Description | Success status |
|---|---|---|---|
| `GET` | `/api/events` | List upcoming events | `200 OK` |
| `GET` | `/api/events/{id}` | Get one event's details | `200 OK` |
| `GET` | `/api/events/{id}/seats` | Get the seat map and each seat's status (available/held/sold) | `200 OK` |
| `POST` | `/api/events/{id}/seats/hold` | Temporarily hold one or more specific seats while the user checks out | `201 Created` |
| `DELETE` | `/api/holds/{holdId}` | Release a hold early (e.g. the user changed their mind) | `204 No Content` |
| `POST` | `/api/holds/{holdId}/pay` | Pay for a held set of seats, converting the hold into a confirmed order | `201 Created` |
| `GET` | `/api/me/tickets` | View the logged-in user's purchased tickets | `200 OK` |

**Example: holding seats**

Request:
```json
POST /api/events/42/seats/hold
{
  "seatIds": [1001, 1002]
}
```

Response (`201 Created`):
```json
{
  "holdId": "h_8f3a",
  "seatIds": [1001, 1002],
  "expiresAt": "2026-10-25T18:05:00Z"
}
```

If a requested seat is no longer available, the response is `409 Conflict`:
```json
{
  "error": "Conflict",
  "message": "Seat 1002 is no longer available."
}
```

## 4. Data model

### Tables

**`users`**
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `name` | TEXT | NOT NULL |
| `email` | TEXT | NOT NULL, UNIQUE |

**`events`**
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `name` | TEXT | NOT NULL |
| `venue` | TEXT | NOT NULL |
| `event_date` | TEXT | NOT NULL |

**`seats`**
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `event_id` | INTEGER | Foreign key → `events.id`, NOT NULL |
| `section` | TEXT | NOT NULL |
| `row` | TEXT | NOT NULL |
| `seat_number` | INTEGER | NOT NULL |
| `status` | TEXT | NOT NULL, one of `'available'`, `'held'`, `'sold'` |
| `held_by_user_id` | INTEGER | Foreign key → `users.id`, nullable |
| `hold_expires_at` | TEXT | nullable |

`UNIQUE(event_id, section, row, seat_number)` stops the same physical seat being defined twice for one event.

**`orders`**
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `user_id` | INTEGER | Foreign key → `users.id`, NOT NULL |
| `event_id` | INTEGER | Foreign key → `events.id`, NOT NULL |
| `status` | TEXT | NOT NULL, e.g. `'paid'`, `'cancelled'` |
| `created_at` | TEXT | Defaults to the current time |

**`order_seats`** (join table — an order can cover multiple seats)
| Column | Type | Notes |
|---|---|---|
| `order_id` | INTEGER | Foreign key → `orders.id` |
| `seat_id` | INTEGER | Foreign key → `seats.id`, **UNIQUE** |

### Relationships

- **`users` → `orders` is one-to-many.** One user can place many orders.
- **`events` → `seats` is one-to-many.** One event has many seats.
- **`orders` ↔ `seats` is many-to-many in shape** (an order can include several seats), modeled through the `order_seats` join table — but critically, `seat_id` in `order_seats` is marked **UNIQUE**, which means in practice each seat can only ever appear in *one* order for its entire lifetime. This UNIQUE constraint is not just documentation — it is the database's own enforcement that a seat can never be sold twice, even if every check in the application code somehow failed.

### CREATE TABLE statements

```sql
CREATE TABLE users (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  venue      TEXT NOT NULL,
  event_date TEXT NOT NULL
);

CREATE TABLE seats (
  id               INTEGER PRIMARY KEY,
  event_id         INTEGER NOT NULL,
  section          TEXT NOT NULL,
  row              TEXT NOT NULL,
  seat_number      INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'available',
  held_by_user_id  INTEGER,
  hold_expires_at  TEXT,
  UNIQUE (event_id, section, row, seat_number),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (held_by_user_id) REFERENCES users(id)
);

CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  event_id   INTEGER NOT NULL,
  status     TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE order_seats (
  order_id INTEGER NOT NULL,
  seat_id  INTEGER NOT NULL UNIQUE,
  PRIMARY KEY (order_id, seat_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (seat_id)  REFERENCES seats(id)
);
```

## 5. Preventing double-booking

This is the single most important correctness requirement in the whole system, and
it's handled at two layers:

**Layer 1 — an atomic "check and change" at hold time.** Holding a seat is done with
a single atomic UPDATE, not a separate "check if available" query followed by a
separate "mark as held" query:

```sql
UPDATE seats
SET status = 'held', held_by_user_id = ?, hold_expires_at = ?
WHERE id = ? AND status = 'available';
```

If two people click the same seat at the exact same moment, the database guarantees
only **one** of these UPDATE statements can actually change the row — whichever one
the database processes first. The second request's UPDATE affects **zero rows**
(because by the time it runs, `status` is no longer `'available'`), so the app server
can detect this and immediately respond `409 Conflict`, telling that user someone
beat them to it. Checking availability and making the change as *two separate steps*
(a `SELECT` followed by an `UPDATE`) would leave a window where both requests could
see the seat as available before either one updates it — that race condition is
exactly what the single atomic UPDATE avoids.

**Layer 2 — a UNIQUE constraint as a final safety net.** When a hold is paid for, the
app server inserts a row into `order_seats` with that seat's id. Because
`order_seats.seat_id` is `UNIQUE`, the database itself will reject a second attempt
to insert the same `seat_id` into `order_seats`, even in the (extremely unlikely)
case that the application code had a bug and tried to let a seat be sold twice. This
means double-booking is prevented by the database's own guarantees, not just by
careful application code that could someday have a bug.

**Expiring stale holds.** A hold lasts a short time (e.g. 5 minutes). A background
job periodically runs `UPDATE seats SET status = 'available' ... WHERE status =
'held' AND hold_expires_at < now()`, returning abandoned holds to the pool so seats
don't get stuck forever if someone holds a seat and never completes payment.

## 6. Architecture

```
┌────────────────┐  static files  ┌─────────────────────┐
│ Browser/mobile  │───────────────>│ CDN (HTML, CSS, JS) │
│ client          │                └─────────────────────┘
└────────┬────────┘
         │ API calls (HTTPS/JSON)
         v
  ┌─────────────────────┐
  │ Rate limiter /       │  (throttles and queues the burst
  │ virtual waiting room │   of requests during a big sale)
  └──────────┬───────────┘
             v
      ┌───────────────┐
      │ Load balancer  │
      └───────┬────────┘
              │
       ┌──────┼──────┐
       v      v      v
    ┌───────┐ ┌───────┐ ┌───────┐
    │ App 1 │ │ App 2 │ │ App 3 │─────────────> ┌───────────────┐
    └───┬───┘ └───┬───┘ └───┬───┘               │ Cache (Redis) │
        │         │         │                   │ (seat map     │
        │ ALL hold/pay      │ general browsing   │  reads)       │
        │ writes go direct  │ reads can use      └───────────────┘
        │ to the primary    │ replicas
        v                   v
  ┌─────────┐          ┌───────────┐          ┌───────┐      ┌────────┐
  │ Primary │>─────────>│ Read      │          │ Queue │────>│ Worker │
  │   DB    │           │ replicas  │          └───────┘     └────────┘
  └─────────┘           └───────────┘           (confirmation emails,
                                                  generating PDF tickets)
```

### Explaining each component

- **CDN** serves the static front end close to each user, keeping normal browsing fast.
- **Rate limiter / virtual waiting room** is the component that lets TicketHub survive the big sale specifically: instead of letting all 200,000 people hit the purchase flow in the same instant, it admits users at a rate the backend can actually handle, giving everyone a fair, first-come queue position rather than favoring whoever's script fires fastest.
- **Load balancer** spreads admitted traffic across several app servers and removes any server that fails its health check.
- **App servers (3+, stateless)** handle browsing, holds and payments, and can be scaled horizontally for the sale.
- **Cache (Redis)** serves the frequently-viewed seat map so the huge volume of "is this seat still available?" page views doesn't hammer the database; it's refreshed whenever a seat's status actually changes.
- **Primary database** is where **every** seat hold and payment write goes — never a replica — because holds and sales must be instantly consistent; a replica's slight lag could let two people both believe a seat is free.
- **Read replicas** handle ordinary browsing reads (event listings, past order history) that don't need split-second consistency, keeping that load off the primary.
- **Queue + worker** handle slow work that doesn't need to block the purchase response, like emailing a receipt or generating a PDF ticket.

### How this survives the big sale

The waiting room absorbs the initial flood of 200,000 near-simultaneous requests and releases them at a controlled rate. Every seat hold and purchase still goes through the same atomic, constraint-protected database operations described in Part 5, so even under extreme concurrency, a seat can still only go to one person. The cache absorbs the huge read volume of people watching the seat map update, so the primary database is mostly dealing with writes (holds/sales) rather than being swamped by reads at the same time.

## 7. Trade-offs

1. **Consistency versus scalability for writes.** Routing every seat hold and payment to the primary database (never a replica) sacrifices some of the horizontal read-scaling we get elsewhere in the system, but it's the right trade here: correctness (never double-selling a seat) matters far more than shaving a few milliseconds off one request, especially for a purchase a user may be paying real money for.
2. **Fairness versus simplicity.** Building a virtual waiting room adds a whole extra component to design, build and operate — it would be simpler to just let everyone hit the purchase endpoint directly. But without it, the big sale becomes a race that rewards bots and the fastest connections rather than genuine fans, which is a worse outcome for the business even though it's more work to prevent.
3. **Cost versus reliability.** Running enough app servers and cache capacity to handle a 65×-normal spike means paying for capacity that sits mostly idle between big sales. This cost is justified because a popular on-sale event going down is the single most damaging, visible failure this business can have.