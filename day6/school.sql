-- Enforce foreign key constraints (SQLite requires this to be turned on explicitly)
PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. CREATE TABLE statements
-- ============================================================

CREATE TABLE students (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id      INTEGER PRIMARY KEY,
  title   TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3
);

-- The enrolments table links students and courses, and holds the grade.
-- UNIQUE(student_id, course_id) stops the same student enrolling on the
-- same course twice.
CREATE TABLE enrolments (
  id         INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      TEXT,
  UNIQUE (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);

-- ============================================================
-- 2. Sample data
-- ============================================================

-- Students (4, so one has no enrolments for the "no enrolments" query)
INSERT INTO students (name, email) VALUES ('Amina Otieno', 'amina@example.com');
INSERT INTO students (name, email) VALUES ('Brian Kamau', 'brian@example.com');
INSERT INTO students (name, email) VALUES ('Grace Wanjiku', 'grace@example.com');
INSERT INTO students (name, email) VALUES ('David Mwangi', 'david@example.com');

-- Courses
INSERT INTO courses (title, credits) VALUES ('Intro to Databases', 3);
INSERT INTO courses (title, credits) VALUES ('Web Foundations', 4);
INSERT INTO courses (title, credits) VALUES ('Mathematics for Computing', 3);

-- Enrolments (5 total; David (student 4) is deliberately left with none)
-- id 1: Amina     -> Intro to Databases   (graded)
INSERT INTO enrolments (student_id, course_id, grade) VALUES (1, 1, 'A');
-- id 2: Amina     -> Web Foundations      (graded)
INSERT INTO enrolments (student_id, course_id, grade) VALUES (1, 2, 'B+');
-- id 3: Brian     -> Web Foundations      (graded)
INSERT INTO enrolments (student_id, course_id, grade) VALUES (2, 2, 'A-');
-- id 4: Brian     -> Mathematics          (not graded yet)
INSERT INTO enrolments (student_id, course_id, grade) VALUES (2, 3, NULL);
-- id 5: Grace     -> Intro to Databases   (graded)
INSERT INTO enrolments (student_id, course_id, grade) VALUES (3, 1, 'B');

-- ============================================================
-- 3. The five required queries
-- ============================================================

-- Query 1: All courses for one student, by name (Amina Otieno)
SELECT courses.title, courses.credits, enrolments.grade
FROM enrolments
JOIN students ON enrolments.student_id = students.id
JOIN courses  ON enrolments.course_id  = courses.id
WHERE students.name = 'Amina Otieno';

-- Query 2: All students on one course (Web Foundations)
SELECT students.name, students.email, enrolments.grade
FROM enrolments
JOIN students ON enrolments.student_id = students.id
JOIN courses  ON enrolments.course_id  = courses.id
WHERE courses.title = 'Web Foundations';

-- Query 3: The number of students enrolled per course
-- (LEFT JOIN keeps every course even if it has zero students)
SELECT courses.title, COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id;

-- Query 4: Students who have no enrolments
-- (LEFT JOIN + checking for NULL finds students with no matching row)
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;

-- Query 5: Update one enrolment's grade
-- (Brian's Mathematics enrolment, id 4, previously had no grade)
UPDATE enrolments
SET grade = 'A'
WHERE id = 4;