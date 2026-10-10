// -------- 1. Select the elements we need --------
const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

// Storage keys
const DRAFT_KEY = "quicknotes-draft";
const THEME_KEY = "quicknotes-theme";

const MAX_CHARS = 200;
const WARNING_CHARS = 180;


// -------- 2. Update the character and word counters --------
function updateCounters() {
    const text = noteText.value;

    // Count characters, including spaces
    const characters = text.length;

    // Count words, ignoring extra spaces and empty text
    const words = text.trim() === ""  ? 0  : text.trim().split(/\s+/).length;

    // Display the counts
    charCount.textContent = `${characters} / ${MAX_CHARS} characters`;
    wordCount.textContent = `${words} words`;

    // Remove old counter classes
    charCount.classList.remove("warning", "over");

    // Apply the appropriate class
    if (characters > MAX_CHARS) {
        charCount.classList.add("over");
    } else if (characters > WARNING_CHARS) {
        charCount.classList.add("warning");
    }
}


// -------- 3. Save the draft to localStorage --------
function saveDraft() {
    localStorage.setItem(DRAFT_KEY, noteText.value);
}


// -------- 4. Restore the draft when the page loads --------
function loadDraft() {
    const savedDraft = localStorage.getItem(DRAFT_KEY);

    if (savedDraft !== null) {
        noteText.value = savedDraft;
    }

    updateCounters();
}


// -------- 5. Clear the textarea and draft --------
function clearNote() {
    noteText.value = "";

    localStorage.removeItem(DRAFT_KEY);

    updateCounters();

    noteText.focus();
}


// -------- 6. Listen for typing in the textarea --------
noteText.addEventListener("input", () => {
    updateCounters();
    saveDraft();
});


// -------- 7. Clear button --------
clearBtn.addEventListener("click", clearNote);


// -------- 8. Press Escape to clear the note --------
noteText.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        clearNote();
    }
});


// -------- 9. Load and apply the saved theme --------
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }

    updateThemeButton();
}


// -------- 10. Update the theme button label --------
function updateThemeButton() {
    if (document.body.classList.contains("dark")) {
        themeToggle.textContent = "Light mode";
    } else {
        themeToggle.textContent = "Dark mode";
    }
}


// -------- 11. Toggle the theme --------
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const currentTheme = document.body.classList.contains("dark")
        ? "dark"
        : "light";

    localStorage.setItem(THEME_KEY, currentTheme);

    updateThemeButton();
});


// -------- 12. Initialize the page --------
loadDraft();
loadTheme();
