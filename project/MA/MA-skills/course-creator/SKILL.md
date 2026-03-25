---
name: course-creator
description: Create structured courses, curricula, lesson plans, and exam prep materials from topics or books
---

# Course Creator Skill

## Triggers

- "create a course", "build a course", "design a course"
- "curriculum", "syllabus", "lesson plan"
- "book to course", "turn this book into a course"
- "exam prep", "prepare for exam", "study for test", "mock exam"
- "midterm", "final exam", "assessment"

## Mode Detection

| Signal | Mode |
|--------|------|
| "book to course" / "textbook" + "course" / "turn this book" | BOOK-TO-COURSE |
| "exam" / "test" / "midterm" / "final" + "prep" / "prepare" / "study" | EXAM PREP |
| Default (course / curriculum / syllabus / lesson plan) | COURSE CREATOR |

## Workflow

### Course Creator
1. Requirements — subject, audience, depth, optional source material
2. Research — web_search for standard curriculum, key concepts, prerequisites
3. Course structure — 4-12 modules, prerequisite mapping, lesson sequence, time estimates
4. INTERACTIVE PAUSE — present outline, get user feedback
5. Lesson content — objectives (Bloom's), explanations, examples, vocabulary, practice
6. Assessments — per-module quizzes, midterm, final (all with answer keys)
7. Syllabus — week-by-week schedule, grading weights, study tips
8. Output all to `course-{subject}/`

### Book-to-Course
1. Book upload — use existing POST /api/book/upload to chunk
2. Chapter analysis — extract arguments, concepts, vocabulary per chunk batch
3. Course mapping — restructure chapters into modules, flag core vs reference
4. INTERACTIVE PAUSE — present proposed structure
5. Module content — objectives, summary, takeaways, reading assignments, discussion, practice
6. Assessments — quizzes, midterm, final
7. Reading schedule — day/week plan with page references
8. Optional tutor entity creation
9. Output all to `course-{subject}/`

### Exam Prep
1. Exam details — subject, format, topics, date, practice materials
2. Study plan — day-by-day (if date) or topic-ordered (if no date)
3. Topic reviews — concise concept review, practice questions, worked examples, exam traps
4. Cheat sheet — one-page summary of most important facts
5. Mock exam — full-length, matching real format + separate answer key
6. Optional tutor entity creation
7. Output all to `exam-prep-{subject}/`

## API Endpoints

- `POST /api/book/upload` — Chunk book for Book-to-Course mode
- `POST /api/entities/create` — Create optional tutor entity
- `POST /api/entities/{id}/memories/inject` — Inject subject knowledge
- `POST /api/entities/{id}/cognitive/tick` — Process tutor cognitive state

## Tools Used

- `web_fetch` — API calls to NekoCore OS
- `web_search` — Research curriculum standards, resources
- `ws_write` — Output course documents to workspace
- `ws_read` — Load source material if provided
