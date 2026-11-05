// Add or edit entries here. One object creates one menu item and one orbit dot.
const entries = [
  { id: "ai", category: "Assignments", title: "AI-assisted writing research", description: "A research project about AI-assisted writing, data and visual analysis." },
  { id: "week5", category: "Weekly Feedback", title: "Week 05 · 这里写标题", description: "这里写首页预览中显示的简短文字。" },
  { id: "week3", category: "Weekly Feedback", title: "Week 03 · AI and creative thinking", description: "Lecture notes and thoughts about AI, creativity and independent judgement." },
  { id: "week2", category: "Weekly Feedback", title: "Week 02 · Digital identity", description: "Notes about digital identity, self-presentation and filter bubbles." },
  { id: "week1", category: "Weekly Feedback", title: "Week 01 · Beginning the journey", description: "First impressions and questions about the course." },
  { id: "reading", category: "Weekly Feedback", title: "Reading and theory notes", description: "Key ideas and references collected from course readings." },
  { id: "day1", category: "Daily Life", title: "A day in Leeds", description: "Photographs and small moments from a day in Leeds." },
  { id: "day2", category: "Daily Life", title: "In between classes", description: "Little moments between lectures and study sessions." },
  { id: "day3", category: "Daily Life", title: "Weekend fragments", description: "Places, people and details from the weekend." }
];
const categories = [
  { name: "Assignments", slug: "assignments", angle: 90 },
  { name: "Weekly Feedback", slug: "weekly", angle: 210 },
  { name: "Daily Life", slug: "daily", angle: 330 }
];
const $ = (id) => document.getElementById(id);
const indexPage = $("indexPage"), menuPage = $("menuPage");
const orbitPoints = $("orbitPoints"), preview = $("preview");
const editorBackground = $("editorBackground"), titleInput = $("editorTitle"), textInput = $("editorText");
const photoInput = $("photoInput"), photoList = $("photoList"), imageViewer = $("imageViewer"), largeImage = $("largeImage");
let currentId = "", photoItems = []; const categoryEntries = (name) => entries.filter((item) => item.category === name);
const findEntry = (id) => entries.find((item) => item.id === id);
const getText = (item, key, fallback) => localStorage.getItem(key + item.id) || window.publishedContent?.[item.id]?.[key === "title-" ? "title" : "text"] || fallback;
function openPhotoDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("elaine-photo-db", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function loadPhotos(id) {
  const db = await openPhotoDB();
  try {
    const stored = await new Promise((resolve, reject) => {
      const request = db.transaction("photos").objectStore("photos").get(id);
      request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error);
    });
    if (stored.length) return stored;
    return Promise.all((window.publishedContent?.[id]?.photos || []).map(async (src) => (await fetch(src)).blob()));
  } finally { db.close(); }
}
async function savePhotos(id, blobs) {
  const db = await openPhotoDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put(blobs, id);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
function saveCurrentPhotos() {
  if (currentId) savePhotos(currentId, photoItems.map((item) => item.blob)).catch(() => {});
}
function renderOrbit() {
  orbitPoints.innerHTML = "";
  entries.forEach((item) => {
    const group = categoryEntries(item.category), rank = group.indexOf(item);
    const category = categories.find((cat) => cat.name === item.category);
    const angle = (category.angle + ((rank * 23) % 52) - 26) * Math.PI / 180;
    const radius = 18 + (rank % 6) * 5.2;
    const button = document.createElement("button");
    button.className = "orbit-point";
    button.type = "button";
    button.dataset.id = item.id;
    button.style.left = 50 + Math.cos(angle) * radius + "%";
    button.style.top = 50 - Math.sin(angle) * radius + "%";
    button.setAttribute("aria-label", item.title);
    button.onclick = () => showPreview(item.id);
    orbitPoints.appendChild(button);
  });
}
function renderMenu() {
  $("menuSections").innerHTML = "";
  categories.forEach((category) => {
    const section = document.createElement("section");
    section.className = "menu-section " + category.slug;
    section.innerHTML = '<div class="section-heading"><h2></h2></div><div class="entry-list"></div>';
    section.querySelector("h2").textContent = category.name;
    const list = section.querySelector(".entry-list");
    categoryEntries(category.name).forEach((item) => {
      const button = document.createElement("button");
      button.className = "entry-button";
      button.type = "button";
      button.textContent = getText(item, "title-", item.title);
      button.onclick = () => openEditor(item.id);
      list.appendChild(button);
    });
    $("menuSections").appendChild(section);
  });
}
function showPreview(id) {
  const item = findEntry(id);
  if (!item) return;
  $("previewTitle").textContent = getText(item, "title-", item.title);
  $("previewText").textContent = getText(item, "note-", item.description);
  preview.classList.add("show");
  document.querySelectorAll(".orbit-point").forEach((dot) => {
    dot.classList.toggle("selected", dot.dataset.id === id);
  });
}
function closePreview() { preview.classList.remove("show"); document.querySelectorAll(".orbit-point").forEach((dot) => dot.classList.remove("selected")); }
async function openEditor(id) {
  const item = findEntry(id);
  if (!item) return;
  currentId = id;
  $("editorCategory").textContent = item.category.toUpperCase();
  titleInput.value = getText(item, "title-", item.title);
  textInput.value = getText(item, "note-", item.description);
  clearPhotos();
  editorBackground.classList.add("open");
  document.body.style.overflow = "hidden";
  try {
    const blobs = await loadPhotos(id);
    if (currentId === id) {
      photoItems = blobs.map((blob) => ({ blob, url: URL.createObjectURL(blob) }));
      renderPhotos();
    }
  } catch (_) {}
}
function closeEditor() {
  editorBackground.classList.remove("open");
  clearPhotos();
  currentId = "";
  renderMenu();
  document.body.style.overflow = menuPage.classList.contains("hidden") ? "hidden" : "auto";
}
function renderPhotos() {
  photoList.innerHTML = "";
  photoItems.forEach((photo, index) => {
    const box = document.createElement("div"), image = document.createElement("img");
    const remove = document.createElement("button");
    box.className = "photo-item";
    image.src = photo.url;
    image.alt = "Uploaded work"; remove.type = "button"; remove.textContent = "×"; image.onclick = () => { largeImage.src = photo.url; imageViewer.classList.add("open"); };
    remove.onclick = () => {
      URL.revokeObjectURL(photo.url);
      photoItems.splice(index, 1);
      renderPhotos();
      saveCurrentPhotos();
    };
    box.append(image, remove);
    photoList.appendChild(box);
  });
}
function clearPhotos() {
  photoItems.forEach((item) => URL.revokeObjectURL(item.url));
  photoItems = [];
  photoList.innerHTML = "";
}
function showIndex() {
  indexPage.classList.remove("hidden");
  menuPage.classList.add("hidden");
  $("indexButton").classList.add("active");
  $("menuButton").classList.remove("active");
  document.body.style.overflow = "hidden";
  closeEditor();
  closePreview();
}
function showMenu() {
  indexPage.classList.add("hidden");
  menuPage.classList.remove("hidden");
  $("indexButton").classList.remove("active");
  $("menuButton").classList.add("active");
  document.body.style.overflow = "auto";
  closeEditor();
  closePreview();
  window.scrollTo(0, 0);
}
titleInput.oninput = () => currentId && localStorage.setItem("title-" + currentId, titleInput.value);
textInput.oninput = () => currentId && localStorage.setItem("note-" + currentId, textInput.value);
photoInput.onchange = () => {
  Array.from(photoInput.files).forEach((file) => {
    if (file.type.startsWith("image/")) photoItems.push({ blob: file, url: URL.createObjectURL(file) });
  });
  photoInput.value = "";
  renderPhotos();
  saveCurrentPhotos();
};
$("indexButton").onclick = showIndex;
$("menuButton").onclick = showMenu;
$("enterMenu").onclick = showMenu;
$("backToIndex").onclick = showIndex;
$("homeButton").onclick = (event) => { event.preventDefault(); showIndex(); };
$("closePreview").onclick = closePreview;
$("closeEditor").onclick = closeEditor;
$("doneButton").onclick = closeEditor;
$("addPhoto").onclick = () => photoInput.click();
$("closeImage").onclick = () => imageViewer.classList.remove("open"); imageViewer.onclick = (event) => { if (event.target === imageViewer) imageViewer.classList.remove("open"); };
editorBackground.onclick = (event) => event.target === editorBackground && closeEditor();
document.onkeydown = (event) => {
  if (event.key !== "Escape") return;
  if (imageViewer.classList.contains("open")) return imageViewer.classList.remove("open");
  editorBackground.classList.contains("open") ? closeEditor() : closePreview();
};
renderOrbit();
renderMenu();
showIndex();
