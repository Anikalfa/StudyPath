const USD_TO_BDT = 120;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY = "studyPath.searchCache.v3";
const PAGE_SIZE = 6;
const OTHER_PATTERN = /^[A-Za-z0-9 ,.&+\-]{1,40}$/;
const $ = (selector) => document.querySelector(selector);
const form = $("#finder-form");
const resultsEl = $("#results");
const formMessage = $("#form-message");
const fields = {
  education: $("#education"), educationOther: $("#education-other"), department: $("#department"), departmentOther: $("#department-other"),
  targetLevel: $("#target-level"), targetLevelOther: $("#target-level-other"), programField: $("#program-field"), programFieldOther: $("#program-field-other"),
  english: $("#english-proof"), englishOther: $("#english-other")
};
let countries = [];
let currentResults = [];
let currentCgpa = 0;
let lastFocused = null;
let currentPage = 1;

function sanitizeOther(value) {
  return String(value || "").trim().replace(/[^A-Za-z0-9 ,.&+\-]/g, "").slice(0, 40).trim();
}
function sanitizeKeywords(value) {
  return String(value || "").replace(/[<>\u0000-\u001F\u007F]/g, "").slice(0, 100).trim();
}
function withOther(selectEl, inputEl) {
  if (selectEl.value !== "Other") return selectEl.value;
  const cleaned = sanitizeOther(inputEl.value);
  inputEl.value = cleaned;
  return cleaned ? `Other:${cleaned}` : "";
}
function connectOther(selectEl, inputEl) {
  const update = () => { inputEl.hidden = selectEl.value !== "Other"; };
  selectEl.addEventListener("change", update);
  inputEl.addEventListener("input", () => { inputEl.value = sanitizeOther(inputEl.value); });
  update();
}
Object.entries(fields).forEach(([key, selectEl]) => {
  if (!key.endsWith("Other") && fields[`${key}Other`]) connectOther(selectEl, fields[`${key}Other`]);
});

const fieldsByDepartment = {
  CSE: ["IT", "AI", "Data Science", "Cyber Security", "Software Engineering", "Robotics"],
  EEE: ["Power", "Electronics", "Telecom", "Embedded Systems", "AI"],
  BBA: ["MBA", "Finance", "Marketing", "Business Analytics", "Supply Chain"],
  Business: ["MBA", "Finance", "Marketing", "Business Analytics", "Supply Chain"],
  Science: ["Biology", "Chemistry", "Physics", "Environmental Science", "Mathematics"],
  Arts: ["Education", "History", "Media Studies", "International Relations", "Sociology"],
  Medical: ["Public Health", "Biomedical Science", "Nursing", "Health Informatics"],
  Civil: ["Civil Engineering", "Structural Engineering", "Construction Management", "Environmental Engineering"],
  Mechanical: ["Mechanical Engineering", "Mechatronics", "Renewable Energy", "Robotics"]
};
function updateProgramFields() {
  const previous = fields.programField.value;
  const choices = fieldsByDepartment[fields.department.value] || ["Engineering", "Business", "Science", "Public Health", "Education", "Social Sciences"];
  fields.programField.replaceChildren(...choices.map((value) => new Option(value, value)), new Option("Other", "Other"));
  if ([...fields.programField.options].some((option) => option.value === previous)) fields.programField.value = previous;
  fields.programFieldOther.hidden = fields.programField.value !== "Other";
}
fields.department.addEventListener("change", updateProgramFields);
updateProgramFields();
function updateTargetLevels() {
  const levelsByEducation = {
    SSC: ["Foundation", "Diploma", "Bachelor"], HSC: ["Foundation", "Bachelor", "Diploma", "Language Course"],
    Diploma: ["Bachelor", "Diploma", "Language Course"], "A-Level": ["Foundation", "Bachelor", "Diploma", "Language Course"],
    Bachelor: ["Master", "MPhil", "PhD", "Language Course"], Master: ["MPhil", "PhD", "Postdoc", "Language Course"]
  };
  const levels = levelsByEducation[fields.education.value] || ["Bachelor", "Master", "PhD", "Diploma", "Foundation", "MPhil", "Postdoc", "Language Course"];
  const previous = fields.targetLevel.value;
  fields.targetLevel.replaceChildren(...levels.map((value) => new Option(value, value)), new Option("Other", "Other"));
  if (levels.includes(previous) || previous === "Other") fields.targetLevel.value = previous;
  fields.targetLevelOther.hidden = fields.targetLevel.value !== "Other";
}
fields.education.addEventListener("change", updateTargetLevels);
updateTargetLevels();
const displayOther = (value) => String(value || "").startsWith("Other:") ? String(value).slice(6) : value;
function setFieldError(input, message) {
  const error = input.closest("label, fieldset, .field")?.querySelector(".field-error");
  if (error) error.textContent = message;
}

function renderCountries() {
  const holder = $("#country-chips");
  holder.replaceChildren(...countries.map((country) => {
    const chip = document.createElement("span"); chip.className = "chip"; chip.append(document.createTextNode(displayOther(country)));
    const remove = document.createElement("button"); remove.type = "button"; remove.setAttribute("aria-label", `Remove ${displayOther(country)}`); remove.textContent = "×";
    remove.addEventListener("click", () => { countries = countries.filter((item) => item !== country); renderCountries(); });
    chip.append(remove); return chip;
  }));
}
function addCountry() {
  const choice = $("#country-choice"); const otherInput = $("#country-other"); let country = choice.value;
  if (!country) return;
  country = withOther(choice, otherInput);
  if (!country) {
    $("#country-error").textContent = "Enter a valid country name (up to 40 allowed characters).";
    return;
  }
  if (countries.includes(country)) return;
  if (countries.length >= 3 && !countries.includes("Any")) { $("#country-error").textContent = "Choose up to 3 countries."; return; }
  countries = country === "Any" ? ["Any"] : [...countries.filter((item) => item !== "Any"), country];
  $("#country-error").textContent = ""; otherInput.value = ""; renderCountries();
}
$("#country-choice").addEventListener("change", () => { $("#country-other").hidden = $("#country-choice").value !== "Other"; });
$("#country-other").addEventListener("input", (event) => { event.target.value = sanitizeOther(event.target.value); });
$("#add-country").addEventListener("click", addCountry);
$("#country-choice").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addCountry(); } });

function setBudget(value) {
  const budget = Math.max(500, Math.round(Number(value) / 500) * 500 || 500);
  $("#budget").value = budget;
  $("#budget-bdt").textContent = `৳${(budget * USD_TO_BDT).toLocaleString("en-US")} / yr`;
  document.querySelectorAll(".budget-preset").forEach((button) => button.classList.toggle("active", Number(button.dataset.budget) === budget));
}
document.querySelectorAll(".budget-preset").forEach((button) => button.addEventListener("click", () => setBudget(button.dataset.budget)));
$("#budget").addEventListener("input", (event) => setBudget(event.target.value));
$("#budget-minus").addEventListener("click", () => setBudget(Number($("#budget").value) - 500));
$("#budget-plus").addEventListener("click", () => setBudget(Number($("#budget").value) + 500));
setBudget($("#budget").value);
function updateEnglishFields() {
  const choice = fields.english.value;
  $("#english-score-wrap").hidden = !["IELTS", "TOEFL", "Duolingo", "PTE"].includes(choice);
  $("#moi-medium-wrap").hidden = choice !== "MOI";
  $("#no-test-note").hidden = choice !== "NONE";
  if (choice === "MOI") $("#filter-english").value = "moi";
  if (choice === "NONE") $("#filter-english").value = "none";
  if ($("#result-count").textContent !== "No search yet") renderResults();
}
fields.english.addEventListener("change", updateEnglishFields);
updateEnglishFields();

function convertCgpa(value, scale) {
  const number = Number(value); const maximum = Number(scale);
  if (!Number.isFinite(number) || number < 0 || number > maximum) return NaN;
  return Math.round((number / maximum) * 4 * 100) / 100;
}
function cacheSignature(values) { return JSON.stringify(values); }
function readCache(signature) {
  try {
    const store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); const entry = store[signature];
    if (entry && entry.expiresAt > Date.now() && Array.isArray(entry.results) && entry.results.length) return entry.results;
    delete store[signature]; localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch { localStorage.removeItem(CACHE_KEY); }
  return null;
}
function writeCache(signature, results) {
  if (!results.length) return;
  try {
    const store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); store[signature] = { expiresAt: Date.now() + CACHE_TTL, results };
    const entries = Object.entries(store).sort((a, b) => b[1].expiresAt - a[1].expiresAt).slice(0, 12);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}
function collectFormData() {
  const values = {
    countries: [...countries], education: withOther(fields.education, fields.educationOther), cgpa: $("#cgpa").value,
    scale: $("#cgpa-scale").value, department: withOther(fields.department, fields.departmentOther),
    targetLevel: withOther(fields.targetLevel, fields.targetLevelOther), programField: withOther(fields.programField, fields.programFieldOther),
    english: withOther(fields.english, fields.englishOther), englishScore: $("#english-score").value.trim(), moiMedium: $("#moi-medium").value,
    keywords: sanitizeKeywords($("#keywords").value), budget: Number($("#budget").value)
  };
  return { values, cgpa: convertCgpa(values.cgpa, values.scale) };
}
function validateForm(values, cgpa) {
  formMessage.textContent = ""; let valid = true;
  if (!countries.length) { $("#country-error").textContent = "Choose at least one target country."; valid = false; }
  else $("#country-error").textContent = "";
  for (const [select, input] of [[fields.education, fields.educationOther], [fields.department, fields.departmentOther], [fields.targetLevel, fields.targetLevelOther], [fields.programField, fields.programFieldOther], [fields.english, fields.englishOther]]) {
    if (select.value === "Other" && (!input.value.trim() || !OTHER_PATTERN.test(input.value.trim()))) { setFieldError(select, "Enter a valid Other value (up to 40 allowed characters)."); valid = false; }
    else setFieldError(select, "");
  }
  if (!Number.isFinite(cgpa)) { setFieldError($("#cgpa"), "Enter a result within the selected scale."); valid = false; }
  else setFieldError($("#cgpa"), "");
  if (countries.some((country) => country.startsWith("Other:") && !OTHER_PATTERN.test(country.slice(6)))) valid = false;
  if (!values.budget || values.budget < 500) { $("#budget-error").textContent = "Enter a yearly budget of at least $500."; valid = false; }
  else $("#budget-error").textContent = "";
  if (!valid) {
    formMessage.textContent = "Please check the highlighted fields before searching.";
    form.querySelector(".field-error:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return valid;
}
function compactInput(values, cgpa) {
  let english = values.english === "MOI" ? "MOI" : values.english === "NONE" ? "NONE" : values.english.startsWith("Other:") ? values.english : `${values.english}${values.englishScore}`;
  return `country=${values.countries.map(displayOther).join(",")};lvl_now=${displayOther(values.education)};cgpa=${cgpa};dept=${displayOther(values.department)};next=${displayOther(values.targetLevel)};field=${displayOther(values.programField)};keywords=${values.keywords || "none"};budget=${values.budget};eng=${english}${values.english === "MOI" ? `;medium=${values.moiMedium}` : ""}`;
}
function setLoading(loading) {
  $("#find-button").disabled = loading; $("#find-button span:first-child").textContent = loading ? "Finding programs..." : "Find programs";
  if (loading) {
    $("#pagination").hidden = true;
    $("#pagination").replaceChildren();
    resultsEl.replaceChildren(...Array.from({ length: 4 }, () => { const skeleton = document.createElement("div"); skeleton.className = "skeleton"; return skeleton; }));
    $("#result-count").textContent = "Finding your shortlist";
  }
}
function resetResultFilters() {
  $("#reset-filters").click();
}
form.addEventListener("submit", async (event) => {
  event.preventDefault(); const { values, cgpa } = collectFormData();
  if (!validateForm(values, cgpa)) return;
  const signature = cacheSignature(values); currentCgpa = cgpa;
  currentPage = 1;
  resetResultFilters();
  const cachedResults = readCache(signature);
  if (cachedResults) { currentResults = cachedResults; $("#cache-label").hidden = false; renderResults(); $("#results-section").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  $("#cache-label").hidden = true; setLoading(true);
  try {
    const response = await fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ compact: compactInput(values, cgpa), values }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Suggestions are unavailable. Please try again.");
    currentResults = Array.isArray(data.results) ? data.results : []; writeCache(signature, currentResults); formMessage.textContent = ""; renderResults();
    $("#results-section").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    formMessage.textContent = error.message;
    $("#pagination").hidden = true;
    $("#pagination").replaceChildren();
    resultsEl.replaceChildren(emptyState("We couldn't load programs", error.message)); $("#result-count").textContent = "Search unavailable";
    $("#results-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  finally { setLoading(false); }
});

function deadlineInfo(dateString) {
  const date = new Date(`${dateString}T23:59:59`);
  if (!dateString || Number.isNaN(date.getTime())) return { label: "Deadline not listed", className: "urgent", days: null };
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  return { label: days < 0 ? `Passed ${Math.abs(days)}d ago` : `${days} days left`, className: days < 14 ? "urgent" : days < 60 ? "soon" : "safe", days };
}
function fitLabel(minCgpa) {
  if (!Number.isFinite(Number(minCgpa))) return "Check fit";
  if (currentCgpa >= Number(minCgpa) + .25) return "Safe";
  if (currentCgpa >= Number(minCgpa)) return "Match";
  return "Reach";
}
function englishBadge(item) {
  if (item.moi === 1) return ["MOI accepted", "english-moi"];
  if (item.nt === 1) return ["No test required", "english-none"];
  return ["IELTS needed", "english-ielts"];
}
function linkBadge(item) { return item.lk === 2 ? ["Link verified", "link-2"] : item.lk === 1 ? ["University site only", "link-1"] : ["Link unverified", "link-0"]; }
function searchUrl(item) { return `https://www.google.com/search?q=${encodeURIComponent(`${item.u} ${item.p} admission`)}`; }
function officialLink(item, className = "official-link") {
  const link = document.createElement("a"); link.className = `${className}${item.lk === 0 || !item.url ? " unavailable" : ""}`;
  link.target = "_blank"; link.rel = "noopener noreferrer"; link.href = item.lk === 0 || !item.url ? searchUrl(item) : item.url;
  link.textContent = item.lk === 2 ? "Go to official page" : item.lk === 1 ? "Open university site" : "Search official site"; return link;
}
function createBadge(text, className) { const badge = document.createElement("span"); badge.className = `badge ${className}`; badge.textContent = text; return badge; }
function createCard(item, index) {
  const card = document.createElement("article"); card.className = "program-card"; card.style.animationDelay = `${Math.min(index, 6) * 35}ms`; card.tabIndex = 0; card.setAttribute("aria-label", `${item.u}, ${item.p}. View details.`);
  const top = document.createElement("div"); top.className = "card-topline"; const deadline = deadlineInfo(item.dl);
  const deadlineBadge = document.createElement("span"); deadlineBadge.className = `deadline ${deadline.className}`; deadlineBadge.textContent = deadline.label;
  const university = document.createElement("h3"); university.className = "card-university"; university.textContent = item.u; top.append(university, deadlineBadge);
  const program = document.createElement("p"); program.className = "card-program"; program.textContent = item.p;
  const location = document.createElement("p"); location.className = "card-location"; location.textContent = `${item.c ? `${item.c}, ` : ""}${item.co} · ${item.lv} · ${item.int || "Intake varies"}`;
  const total = (Number(item.t) || 0) + (Number(item.l) || 0); const cost = document.createElement("p"); cost.className = "card-cost"; cost.textContent = `$${total.toLocaleString("en-US")} / yr `;
  const bdt = document.createElement("small"); bdt.textContent = `(৳${(total * USD_TO_BDT).toLocaleString("en-US")})`; cost.append(bdt);
  const facts = document.createElement("p"); facts.className = "card-facts"; facts.textContent = `Tuition $${(Number(item.t) || 0).toLocaleString()} · Living $${(Number(item.l) || 0).toLocaleString()} · Min CGPA ${item.cg ?? "N/A"}`;
  const requirements = document.createElement("p"); requirements.className = "card-requirements"; requirements.textContent = item.en || "English requirement varies";
  const badges = document.createElement("div"); badges.className = "badges"; const eng = englishBadge(item); const link = linkBadge(item);
  badges.append(createBadge(`${fitLabel(item.cg)} fit`, "fit"), createBadge(eng[0], eng[1]), createBadge(link[0], link[1]));
  const scholarship = document.createElement("p"); scholarship.className = "card-scholarship"; scholarship.textContent = `Scholarship: ${item.sc || "Not listed"}`;
  const note = document.createElement("p"); note.className = "card-note"; note.textContent = item.moi === 1 ? "Some universities approve MOI case by case. Confirm by email." : item.lk === 1 ? "Exact program page not found. Search the program name on the site." : item.lk === 0 ? "AI could not provide a working link. Verify carefully." : "";
  const actions = document.createElement("div"); actions.className = "card-actions"; const details = document.createElement("button"); details.type = "button"; details.className = "details-button"; details.textContent = "View details"; details.addEventListener("click", () => openDetails(item));
  actions.append(details, officialLink(item)); const disclaimer = document.createElement("p"); disclaimer.className = "card-disclaimer"; disclaimer.textContent = "Deadlines and costs are AI estimates. Always verify on the official website.";
  card.append(top, program, location, cost, facts, requirements, badges, scholarship, note, actions, disclaimer);
  card.addEventListener("click", (event) => { if (!event.target.closest("button,a")) openDetails(item); });
  card.addEventListener("keydown", (event) => { if (event.target === card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openDetails(item); } }); return card;
}
function emptyState(title, message) {
  const holder = document.createElement("div"); holder.className = "empty-state"; const icon = document.createElement("span"); icon.className = "empty-icon"; icon.textContent = "↗";
  const heading = document.createElement("h3"); heading.textContent = title; const text = document.createElement("p"); text.textContent = message; holder.append(icon, heading, text); return holder;
}

function applyFilters(results, filters) {
  const filtered = results.filter((item) => {
    const deadline = item.dl ? new Date(`${item.dl}T00:00:00`) : null; const query = filters.search.toLowerCase();
    const matchesYear = filters.year === "all" || (deadline && deadline.getFullYear() === Number(filters.year));
    const matchesMonth = filters.month === "all" || (deadline && deadline.getMonth() + 1 === Number(filters.month));
    const matchesIntake = filters.intake === "all" || String(item.int).toLowerCase() === filters.intake.toLowerCase();
    const matchesLevel = filters.level === "all" || String(item.lv).toLowerCase() === filters.level.toLowerCase();
    const matchesTuition = (Number(item.t) || 0) <= filters.tuition;
    const matchesScholarship = filters.scholarship === "all" || (filters.scholarship === "available" ? Boolean(item.sc) : /full|fully funded/i.test(item.sc || ""));
    const matchesEnglish = filters.english === "all" || (filters.english === "moi" ? item.moi === 1 : filters.english === "none" ? item.nt === 1 : item.moi !== 1 && item.nt !== 1);
    const matchesTest = filters.test === "all" || (filters.test === "none" ? item.nt === 1 : String(item.en).toLowerCase().includes(filters.test.toLowerCase()));
    const matchesCgpa = !filters.qualify || Number(item.cg) <= currentCgpa;
    const matchesLink = filters.link !== "verified" || item.lk === 2;
    const searchableText = [item.u, item.p, item.c, item.co, item.lv, item.int, item.en, item.sc].join(" ").toLowerCase();
    const matchesSearch = !query || query.split(/[\s,]+/).filter(Boolean).every((term) => searchableText.includes(term));
    return matchesYear && matchesMonth && matchesIntake && matchesLevel && matchesTuition && matchesScholarship && matchesEnglish && matchesTest && matchesCgpa && matchesLink && matchesSearch;
  });
  return filtered.sort((a, b) => {
    if (filters.sort === "cost") return ((Number(a.t) || 0) + (Number(a.l) || 0)) - ((Number(b.t) || 0) + (Number(b.l) || 0));
    if (filters.sort === "ranking") return (Number(a.r) || Infinity) - (Number(b.r) || Infinity);
    return (a.dl || "9999-12-31").localeCompare(b.dl || "9999-12-31");
  });
}
function getFilters() {
  return { year: $("#filter-year").value, month: $("#filter-month").value, intake: $("#filter-intake").value, level: $("#filter-level").value,
    tuition: Number($("#filter-tuition").value), scholarship: $("#filter-scholarship").value, english: $("#filter-english").value, test: $("#filter-test").value,
    qualify: $("#filter-cgpa").checked, link: $("#filter-link").value, sort: $("#filter-sort").value, search: $("#filter-search").value.trim() };
}
function renderPagination(pageCount) {
  const pagination = $("#pagination");
  pagination.replaceChildren();
  pagination.hidden = pageCount <= 1;
  if (pagination.hidden) return;

  function addPageButton(label, page, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-button${options.active ? " active" : ""}`;
    button.textContent = label;
    button.disabled = Boolean(options.disabled);
    if (options.active) button.setAttribute("aria-current", "page");
    button.setAttribute("aria-label", options.ariaLabel || `Page ${page}`);
    button.addEventListener("click", () => {
      currentPage = page;
      renderResults();
      $("#results-section").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    pagination.append(button);
  }

  addPageButton("Previous", Math.max(1, currentPage - 1), { disabled: currentPage === 1, ariaLabel: "Previous page" });
  for (let page = 1; page <= pageCount; page += 1) addPageButton(String(page), page, { active: page === currentPage });
  addPageButton("Next", Math.min(pageCount, currentPage + 1), { disabled: currentPage === pageCount, ariaLabel: "Next page" });
}
function renderResults() {
  const filtered = applyFilters(currentResults, getFilters());
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  currentPage = Math.min(Math.max(currentPage, 1), Math.max(pageCount, 1));
  const pageResults = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  $("#result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "program" : "programs"}`;
  resultsEl.replaceChildren(...(filtered.length ? pageResults.map(createCard) : [emptyState("No programs match these filters", "Adjust your filters to see more of your shortlist.")]));
  renderPagination(pageCount);
}
const filterInputs = ["#filter-year", "#filter-month", "#filter-intake", "#filter-level", "#filter-tuition", "#filter-scholarship", "#filter-english", "#filter-test", "#filter-cgpa", "#filter-link", "#filter-sort", "#filter-search"];
filterInputs.forEach((selector) => $(selector).addEventListener("input", () => {
  if (selector === "#filter-tuition") $("#tuition-value").textContent = Number($(selector).value) >= 50000 ? "Any" : `$${Number($(selector).value).toLocaleString()}`;
  currentPage = 1;
  renderResults();
}));
$("#reset-filters").addEventListener("click", () => {
  $("#filter-year").value = "all"; $("#filter-month").value = "all"; $("#filter-intake").value = "all"; $("#filter-level").value = "all";
  $("#filter-tuition").value = "50000"; $("#tuition-value").textContent = "Any"; $("#filter-scholarship").value = "all"; $("#filter-english").value = "all";
  $("#filter-test").value = "all"; $("#filter-cgpa").checked = false; $("#filter-link").value = "all"; $("#filter-sort").value = "deadline"; $("#filter-search").value = ""; currentPage = 1; renderResults();
});
function detailRow(label, value) {
  const row = document.createElement("div"); row.className = "detail-row"; const name = document.createElement("span"); name.textContent = label;
  const data = document.createElement("strong"); data.textContent = value; row.append(name, data); return row;
}
function openDetails(item) {
  const modal = $("#details-modal"); lastFocused = document.activeElement; const content = $("#modal-content"); content.replaceChildren();
  const heading = document.createElement("h2"); heading.id = "modal-title"; heading.className = "modal-title"; heading.textContent = item.u;
  const program = document.createElement("p"); program.className = "modal-program"; program.textContent = item.p;
  const badges = document.createElement("div"); badges.className = "modal-badges"; const eng = englishBadge(item); const link = linkBadge(item);
  badges.append(createBadge(`${fitLabel(item.cg)} fit`, "fit"), createBadge(eng[0], eng[1]), createBadge(link[0], link[1]));
  const total = (Number(item.t) || 0) + (Number(item.l) || 0); const deadline = deadlineInfo(item.dl); const grid = document.createElement("div"); grid.className = "detail-grid";
  grid.append(detailRow("Location", `${item.c ? `${item.c}, ` : ""}${item.co}`), detailRow("Level", item.lv || "Not listed"), detailRow("Intake", item.int || "Not listed"),
    detailRow("Deadline", `${item.dl || "Not listed"}${deadline.days !== null ? ` · ${deadline.label}` : ""}`),
    detailRow("Tuition / year", `$${(Number(item.t) || 0).toLocaleString()} · ৳${((Number(item.t) || 0) * USD_TO_BDT).toLocaleString()}`),
    detailRow("Living / year", `$${(Number(item.l) || 0).toLocaleString()} · ৳${((Number(item.l) || 0) * USD_TO_BDT).toLocaleString()}`),
    detailRow("Total / year", `$${total.toLocaleString()} · ৳${(total * USD_TO_BDT).toLocaleString()}`), detailRow("Minimum CGPA", String(item.cg ?? "Not listed")),
    detailRow("English", item.en || "Not listed"), detailRow("Scholarship", item.sc || "Not listed"), detailRow("Approx. world ranking", item.r ? `#${item.r}` : "Not listed"));
  content.append(heading, program, badges, grid); const actions = $("#modal-actions"); actions.replaceChildren(officialLink(item));
  if (item.lk === 1 || item.lk === 0) { const note = document.createElement("p"); note.className = "modal-note"; note.textContent = item.lk === 1 ? "Exact program page not found. Search the program name on the site." : "AI could not provide a working link. Verify carefully."; actions.append(note); }
  modal.showModal(); $("#modal-close").focus();
}
$("#modal-close").addEventListener("click", () => $("#details-modal").close());
$("#details-modal").addEventListener("click", (event) => { if (event.target === $("#details-modal")) $("#details-modal").close(); });
$("#details-modal").addEventListener("close", () => lastFocused?.focus());
$("#details-modal").addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return; const focusable = [...$("#details-modal").querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled);
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
  else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
});
$("#filter-toggle").addEventListener("click", () => {
  const shell = $(".filter-shell"); const expanded = shell.classList.toggle("open"); $("#filter-toggle").setAttribute("aria-expanded", String(expanded)); $("#filter-toggle span").textContent = expanded ? "−" : "+";
});
