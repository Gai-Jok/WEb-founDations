// -------- 1. Select the elements we need --------
const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadUserBtn = document.querySelector("#load-users");
const statusText = document.querySelector("#status");
const list = document.querySelector("#users-list");
const filterInput = document.querySelector("#filter-input");

// Store all fetched users so filtering doesn't require another request
let allUsers = [];

// -------- 2. Display a single user --------
function showUser(user) {
    const li = document.createElement("li");

    const name = document.createElement("h3");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    li.appendChild(name);
    li.appendChild(email);
    li.appendChild(city);
    li.appendChild(company);

    list.appendChild(li);
}

// -------- 3. Display users matching the filter --------
function renderUsers(users) {
    list.innerHTML = "";

    const searchText = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchText)
    );

    filteredUsers.forEach(showUser);

    if (filteredUsers.length === 0) {
        const message = document.createElement("li");
        message.textContent = "No users match your filter.";
        list.appendChild(message);
    }

    statusText.textContent = `Showing ${filteredUsers.length} of ${users.length} users.`;
}

// -------- 4. Fetch users from the API --------
async function fetchUsers() {
    statusText.textContent = "Loading users...";
    loadUserBtn.disabled = true;
    list.innerHTML = "";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const users = await response.json();

        // Save users so filtering doesn't need another request
        allUsers = users;

        // Display all users
        renderUsers(allUsers);

    } catch (error) {
        statusText.textContent = "Could not load users. Please try again.";
        console.error(error);
    } 
    
    finally {
        loadUserBtn.disabled = false;
    }
}

// -------- 5. Load users when the button is clicked --------
loadUserBtn.addEventListener("click", fetchUsers);

// -------- 6. Filter users as the user types --------
filterInput.addEventListener("input", () => {
    if (allUsers.length > 0) {
        renderUsers(allUsers);
    }
});