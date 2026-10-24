const API_URL = "https://jsonplaceholder.typicode.com/posts";
const loadBtn = document.querySelector("#load-btn");
const statusEl = document.querySelector("#status");
const list = document.querySelector("#notes-list");
let notes = [];

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type ? `status-${type}` : "";
}

// One reusable function for every request: fetch, check response.ok, throw on errors.
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { status: response.status, data: data };
}

function renderNotes() {
  list.textContent = "";
  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No notes to show.";
    list.appendChild(empty);
    return;
  }
  for (const note of notes) {
    const li = document.createElement("li");
    const title = document.createElement("h3");
    title.textContent = note.title;
    const body = document.createElement("p");
    body.textContent = note.body;
    li.append(title, body);
    if (typeof addDeleteButton === "function") {
      addDeleteButton(li, note);
    }
    list.appendChild(li);
  }
}

async function loadNotes() {
  loadBtn.disabled = true;
  setStatus("Loading notes...", "loading");
  try {
    const { data } = await request(`${API_URL}?_limit=10`);
    notes = data.map((post) => ({
      key: String(post.id),
      id: post.id,
      title: post.title,
      body: post.body,
      local: false,
    }));
    renderNotes();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not load your notes. Please try again.", "error");
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadNotes);

const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

function validateTitle(title) {
  if (title === "") return "Please enter a title.";
  if (title.length > 100) return "Title must be 100 characters or fewer.";
  return "";
}

async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Saving note...", "loading");
  try {
    const { status, data } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });
    notes.unshift({
      key: `local-${Date.now()}`,
      id: data.id,
      title: data.title,
      body: data.body,
      local: true,
    });
    renderNotes();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
    form.reset();
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not save your note. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

form.addEventListener("submit", createNote);
