# School Database Design

## The tables

**`students`** holds one row per student: their `id` (primary key), `name`, and a
`email`, which is marked `UNIQUE` so two students can never share the same
address — this is also the natural column to search by in a real login system.

**`courses`** holds one row per course: an `id` (primary key), a `title`, and
`credits` (with a default of 3, since most courses are standard-weight).

**`enrolments`** records the fact that a specific student is taking a specific
course, and stores the one piece of information that belongs to that
*combination* rather than to the student or the course alone: the `grade`.
It has its own `id`, plus `student_id` and `course_id` as foreign keys
pointing back to `students.id` and `courses.id`. A `UNIQUE(student_id,
course_id)` constraint stops the same student from being inserted onto the
same course twice.

## Relationships

- **`students` → `enrolments` is one-to-many.** One student can have many
  enrolment rows (one per course they take), but each enrolment row belongs
  to exactly one student.
- **`courses` → `enrolments` is one-to-many.** One course can have many
  enrolment rows (one per student taking it), but each enrolment row belongs
  to exactly one course.
- **Put together, `students` and `courses` have a many-to-many relationship**:
  one student can take many courses, and one course can have many students.
  SQL tables can't directly express many-to-many on their own — a row can
  only point to *one* other row via a single foreign key column — so a
  **join table** is needed in between. `enrolments` is that join table: each
  row is one (student, course) pairing. It also happens to carry extra data
  of its own (the grade), which is common for join tables in the real world —
  a plain student–course link wouldn't have anywhere to store it.

## Index

I would add:

```sql
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);
```

**Reason:** one of the most common lookups in this system is "find every
course a given student is taking" (Query 1), which filters `enrolments` by
`student_id`. Without an index, the database has to scan every row in
`enrolments` to find the matches. With an index on `student_id`, it can jump
straight to the relevant rows instead — the same way a sorted phone book
lets you skip straight to a name instead of checking every entry. As the
school grows to thousands of students and enrolments, this keeps that lookup
fast. The trade-off is that every `INSERT` or `UPDATE` on `enrolments` now
also has to keep this index up to date, which is a small, worthwhile cost for
a column we filter on this often.

## SQL or NoSQL?

For this system, I would choose a **SQL (relational) database**, not NoSQL.
The data here is clearly structured and relationship-heavy: students take
courses, courses have students, and the enrolment itself carries a grade —
exactly the kind of many-to-many relationship that SQL's foreign keys and
`JOIN`s are built to handle cleanly. We also need the database to *enforce*
real rules no matter who writes to it — a unique email per student, no
duplicate enrolments, grades tied to an existing student and course — and a
relational database checks these automatically via `UNIQUE`, `NOT NULL`, and
`FOREIGN KEY` constraints. A document database would force me to either
duplicate student and course details inside every enrolment record (so an
email change would need updating in many places) or perform the equivalent
of a join entirely in application code, which is slower to write and easier
to get wrong. If the school later wanted much more flexible, loosely
structured data — e.g., course materials with wildly different fields per
course — a document store might make sense for *that* part, but for the
core students/courses/enrolments relationship, SQL is the better fit.