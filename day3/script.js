// --- Starting data ---
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. searchNotes(word) - notes whose text contains word, ignoring case
function searchNotes(word) {
  return notes.filter((note) =>
    note.text.toLowerCase().includes(word.toLowerCase())
  );
}

// 2. longestNote() - the note object with the most characters, or null if empty
function longestNote() {
  if (notes.length === 0) return null;

  return notes.reduce((longest, note) =>
    note.text.length > longest.text.length ? note : longest
  );
}

// 3. countByCategory() - an object counting notes per category
function countByCategory() {
  const counts = { personal: 0, work: 0, study: 0 };

  notes.forEach((note) => {
    if (counts[note.category] !== undefined) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  });

  return counts;
}

// 4. getSummary() - a sentence describing how many notes exist per category
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const noteWord = total === 1 ? "note" : "notes";

  return `${total} ${noteWord}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

// 5. isDuplicate(text) - true if a note with the same text already exists
//    (ignoring case and extra spaces)
function isDuplicate(text) {
  const cleaned = text.trim().toLowerCase();
  return notes.some((note) => note.text.trim().toLowerCase() === cleaned);
}

// 6. addNote(text, category) - adds a note if valid, not a duplicate, and
//    the category is one of personal, work or study
function addNote(text, category) {
  const cleaned = text.trim();
  const validCategories = ["personal", "work", "study"];

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("❌ Rejected: note must be 1-200 characters.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log(`❌ Rejected: "${category}" is not a valid category.`);
    return false;
  }

  if (isDuplicate(cleaned)) {
    console.log("❌ Rejected: a note with this text already exists.");
    return false;
  }

  const nextId =
    notes.length > 0 ? Math.max(...notes.map((note) => note.id)) + 1 : 1;

  notes.push({ id: nextId, text: cleaned, category });
  console.log(`✅ Added: "${cleaned}" (${category})`);
  return true;
}

// --- Tests ---

// searchNotes
console.log(searchNotes("day 3"));
// [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]
console.log(searchNotes("zzzz"));
// [] (no notes contain "zzzz")

// longestNote
console.log(longestNote());
// { id: 3, text: "Email the project report to Grace", category: "work" }

const savedNotesForLongest = notes;
notes = [];
console.log(longestNote());
// null (no notes to compare)
notes = savedNotesForLongest;

// countByCategory
console.log(countByCategory());
// { personal: 2, work: 1, study: 2 }

const savedNotesForCount = notes;
notes = [];
console.log(countByCategory());
// { personal: 0, work: 0, study: 0 } (no notes yet)
notes = savedNotesForCount;

// getSummary
console.log(getSummary());
// "5 notes: 2 personal, 1 work, 2 study."

const savedNotesForSummary = notes;
notes = [{ id: 1, text: "Only one note", category: "personal" }];
console.log(getSummary());
// "1 note: 1 personal, 0 work, 0 study."
notes = savedNotesForSummary;

// isDuplicate
console.log(isDuplicate("buy milk and bread"));
// true (matches note 1, ignoring case and spacing)
console.log(isDuplicate("Completely new text"));
// false (no existing note matches)

// addNote
console.log(addNote("Pack gym bag", "personal"));
// true - note added successfully
console.log(addNote("Buy milk and bread", "personal"));
// false - rejected as a duplicate of note 1
console.log(addNote("", "work"));
// false - rejected, text is empty (must be 1-200 characters)
console.log(addNote("Plan trip", "fun"));
// false - rejected, "fun" is not a valid category

console.log(notes);
// final array: the original 5 notes plus "Pack gym bag" (6 notes total)