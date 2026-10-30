/* FoodBridge educational demo.
   Data is stored in localStorage in this browser only. Do not use for real credentials or food-safety certification. */
"use strict";

const DB = {
  users: "foodbridge_users_v1",
  donations: "foodbridge_donations_v1",
  requests: "foodbridge_requests_v1",
  session: "foodbridge_session_v1"
};
const ADMIN = { name: "Administrator", email: "admin@foodbridge.demo", password: "Admin@123", role: "admin", area: "FoodBridge" };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function read(key, fallback = []) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function getUsers() { return read(DB.users); }
function getDonations() { return read(DB.donations); }
function getRequests() { return read(DB.requests); }
function setDonations(value) { write(DB.donations, value); }
function setRequests(value) { write(DB.requests, value); }
function getSession() { return read(DB.session, null); }
function setMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not specified" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function remainingMs(donation) { return new Date(donation.deadline).getTime() - Date.now(); }
function timeLeft(donation) {
  const ms = remainingMs(donation);
  if (!Number.isFinite(ms)) return "Deadline unavailable";
  if (ms <= 0) return "Deadline passed";
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days}d ${hours}h remaining`;
  if (hours) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}
function isExpired(donation) {
  return !donation.deadline || !Number.isFinite(new Date(donation.deadline).getTime()) || remainingMs(donation) <= 0;
}
function syncExpired() {
  const donations = getDonations();
  let changed = false;
  donations.forEach(d => {
    if (d.status !== "Collected" && d.status !== "Expired" && isExpired(d)) {
      d.status = "Expired";
      changed = true;
    }
  });
  if (changed) setDonations(donations);
  return donations;
}
function publicAvailable(donation) { return donation.status === "Available" && !isExpired(donation); }
function statusClass(status) {
  return `status-${String(status || "").toLowerCase().replace(/[^a-z]+/g, "-")}`;
}
function statusPill(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHTML(status)}</span>`;
}
function userById(id) { return getUsers().find(user => user.id === id); }
function currentUser() {
  const session = getSession();
  if (!session) return null;
  if (session.role === "admin") return session;
  return userById(session.id) || null;
}
function redirectForRole(role) {
  location.href = ({ donor: "donor.html", receiver: "receiver.html", admin: "admin.html" })[role] || "index.html";
}
function requireRole(role) {
  const user = currentUser();
  if (!user || user.role !== role) {
    location.replace("login.html");
    return null;
  }
  return user;
}
function logout() {
  localStorage.removeItem(DB.session);
  location.href = "index.html";
}
function setupLogout() {
  $$("[data-logout]").forEach(button => button.addEventListener("click", logout));
}
function seedDemoData() {
  if (!localStorage.getItem(DB.donations)) {
    const now = Date.now();
    setDonations([
      { id: uid("food"), donorId: "demo-donor", donorName: "Green Bowl Kitchen", foodName: "Vegetable rice meal boxes", category: "Meals", quantity: 30, location: "Miyapur, Hyderabad", preparedAt: new Date(now - 30*60000).toISOString(), deadline: new Date(now + 4*3600000).toISOString(), storage: "Kept hot safely", allergens: "Contains possible traces of nuts", notes: "Pickup from the side entrance.", status: "Available", createdAt: new Date(now - 10*60000).toISOString(), requests: [] },
      { id: uid("food"), donorId: "demo-donor", donorName: "Sunrise Bakery", foodName: "Fresh bread and buns", category: "Bakery", quantity: 18, location: "Kukatpally, Hyderabad", preparedAt: new Date(now - 45*60000).toISOString(), deadline: new Date(now + 90*60000).toISOString(), storage: "Sealed / packaged", allergens: "Wheat; may contain dairy", notes: "Please bring reusable boxes if possible.", status: "Available", createdAt: new Date(now - 20*60000).toISOString(), requests: [] },
      { id: uid("food"), donorId: "demo-donor", donorName: "Community Event Hall", foodName: "Packed fruit portions", category: "Fruits & Vegetables", quantity: 24, location: "Miyapur, Hyderabad", preparedAt: new Date(now - 20*60000).toISOString(), deadline: new Date(now + 6*3600000).toISOString(), storage: "Refrigerated", allergens: "None known", notes: "Keep chilled during transport.", status: "Available", createdAt: new Date(now - 5*60000).toISOString(), requests: [] }
    ]);
  }
  if (!localStorage.getItem(DB.requests)) setRequests([]);
  if (!localStorage.getItem(DB.users)) write(DB.users, []);
}
function addSeedDemoUserNote() {
  // Seed food cards are illustrative demo records. They do not represent real offers.
}
function initHome() {
  const search = $("#food-search"), category = $("#category-filter"), urgency = $("#urgency-filter");
  const render = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const cat = category?.value || "";
    const urgent = urgency?.value || "";
    const list = syncExpired().filter(d => publicAvailable(d))
      .filter(d => (!query || `${d.foodName} ${d.location} ${d.donorName}`.toLowerCase().includes(query)))
      .filter(d => (!cat || d.category === cat))
      .filter(d => {
        const ms = remainingMs(d);
        return !urgent || (urgent === "urgent" ? ms <= 2*3600000 : ms > 2*3600000);
      })
      .sort((a,b) => remainingMs(a) - remainingMs(b));
    const host = $("#home-donation-list");
    if (host) host.innerHTML = list.map(d => donationCard(d, false)).join("");
    $("#home-empty")?.classList.toggle("hidden", list.length > 0);
    renderHomeStats();
  };
  [search, category, urgency].filter(Boolean).forEach(el => el.addEventListener("input", render));
  render();
}
function donationCard(d, showRequestButton = false, matchNote = "") {
  const ms = remainingMs(d);
  const urgency = ms <= 2*3600000;
  return `<article class="donation-card">
    <div class="card-top"><span class="category-pill">${escapeHTML(d.category)}</span>${urgency ? '<span class="urgency-pill">⚡ Urgent</span>' : statusPill(d.status)}</div>
    <h3>${escapeHTML(d.foodName)}</h3>
    <div class="card-details">
      <span>🍽️ <b>${Number(d.quantity) || 0} servings</b></span>
      <span>📍 ${escapeHTML(d.location)}</span>
      <span>🏪 ${escapeHTML(d.donorName)}</span>
      <span>🕒 Prepared: ${escapeHTML(formatDate(d.preparedAt))}</span>
      <span>🧊 ${escapeHTML(d.storage || "Not specified")}</span>
      <span>⚠️ Allergens: ${escapeHTML(d.allergens || "Not specified")}</span>
      ${d.notes ? `<span>📝 ${escapeHTML(d.notes)}</span>` : ""}
    </div>
    ${matchNote ? `<p class="small-note">${escapeHTML(matchNote)}</p>` : ""}
    <div class="card-footer"><span class="countdown ${urgency ? "" : "safe"}">⏳ ${escapeHTML(timeLeft(d))}</span>${showRequestButton ? `<button class="button primary small" data-request="${escapeHTML(d.id)}">Request food</button>` : ""}</div>
  </article>`;
}
function renderHomeStats() {
  const donations = syncExpired();
  const requests = getRequests();
  const collected = donations.filter(d => d.status === "Collected");
  const meals = collected.reduce((sum,d) => sum + (Number(d.quantity) || 0), 0);
  if ($("#home-meals")) $("#home-meals").textContent = meals.toLocaleString();
  if ($("#home-collected")) $("#home-collected").textContent = collected.length.toLocaleString();
  if ($("#home-donations")) $("#home-donations").textContent = donations.length.toLocaleString();
}
function initRegister() {
  $("#register-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name")).trim();
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));
    const role = String(data.get("role"));
    const area = String(data.get("area")).trim();
    const msg = $("#register-message");
    if (email === ADMIN.email) return setMessage(msg, "This email is reserved for the demo administrator.", true);
    if (getUsers().some(u => u.email === email)) return setMessage(msg, "An account with this email already exists.", true);
    const user = { id: uid("user"), name, email, password, phone: String(data.get("phone") || "").trim(), area, role, createdAt: new Date().toISOString() };
    write(DB.users, [...getUsers(), user]);
    write(DB.session, { id: user.id, name: user.name, email: user.email, role: user.role, area: user.area });
    redirectForRole(role);
  });
}
function initLogin() {
  $("#fill-admin")?.addEventListener("click", () => {
    $("#login-email").value = ADMIN.email;
    $("#login-password").value = ADMIN.password;
  });
  $("#login-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const email = $("#login-email").value.trim().toLowerCase();
    const password = $("#login-password").value;
    const msg = $("#login-message");
    if (email === ADMIN.email && password === ADMIN.password) {
      write(DB.session, { id: "admin", name: ADMIN.name, email: ADMIN.email, role: "admin", area: "FoodBridge" });
      return redirectForRole("admin");
    }
    const user = getUsers().find(u => u.email === email && u.password === password);
    if (!user) return setMessage(msg, "Email or password is incorrect. If this is your first visit, register first.", true);
    write(DB.session, { id: user.id, name: user.name, email: user.email, role: user.role, area: user.area });
    redirectForRole(user.role);
  });
}
function setNavUser(user) {
  const el = $("#nav-user");
  if (el) el.textContent = user?.name || "";
}
function initDonor() {
  const user = requireRole("donor");
  if (!user) return;
  setNavUser(user.name);
  const prepared = $("#prepared-at");
  const deadline = $("#deadline");
  const toLocalInput = date => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0,16);
  };
  if (prepared) prepared.value = toLocalInput(new Date());
  if (deadline) deadline.value = toLocalInput(new Date(Date.now() + 4*3600000));
  $("#donation-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const preparedAt = new Date(String(data.get("preparedAt"))).toISOString();
    const deadlineAt = new Date(String(data.get("deadline"))).toISOString();
    const msg = $("#donation-message");
    if (new Date(deadlineAt).getTime() <= Date.now()) return setMessage(msg, "The deadline must be in the future.", true);
    if (new Date(preparedAt).getTime() > Date.now() + 60000) return setMessage(msg, "Preparation time cannot be in the future.", true);
    if (new Date(deadlineAt).getTime() <= new Date(preparedAt).getTime()) return setMessage(msg, "The deadline must be later than the preparation time.", true);
    const donation = {
      id: uid("food"), donorId: user.id, donorName: user.name,
      foodName: String(data.get("foodName")).trim(), category: String(data.get("category")),
      quantity: Number(data.get("quantity")), location: String(data.get("location")).trim(),
      preparedAt, deadline: deadlineAt, storage: String(data.get("storage")),
      allergens: String(data.get("allergens") || "Not specified").trim(),
      notes: String(data.get("notes") || "").trim(), status: "Available",
      createdAt: new Date().toISOString(), requests: []
    };
    if (!donation.foodName || !donation.location || donation.quantity < 1) return setMessage(msg, "Please enter valid donation details.", true);
    setDonations([donation, ...getDonations()]);
    form.reset();
    prepared.value = toLocalInput(new Date());
    deadline.value = toLocalInput(new Date(Date.now() + 4*3600000));
    $("#safety-confirm").checked = false;
    setMessage(msg, "Donation published successfully.");
    renderDonor();
  });
  renderDonor();
}
function renderDonor() {
  const user = currentUser();
  const donations = syncExpired().filter(d => d.donorId === user.id).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  const host = $("#donor-donations");
  if (host) host.innerHTML = donations.length ? donations.map(d => `<article class="mini-donation"><div class="card-top"><h3>${escapeHTML(d.foodName)}</h3>${statusPill(d.status)}</div><p>${Number(d.quantity)} servings · ${escapeHTML(d.location)}</p><p>Deadline: ${escapeHTML(formatDate(d.deadline))}</p><div class="countdown">${escapeHTML(timeLeft(d))}</div></article>`).join("") : `<div class="empty-state"><span>🍲</span><h3>No donations yet</h3><p>Your published listings will appear here.</p></div>`;
  renderDonorRequests(user);
}
function renderDonorRequests(user) {
  const donations = getDonations().filter(d => d.donorId === user.id);
  const ids = new Set(donations.map(d => d.id));
  const requests = getRequests().filter(r => ids.has(r.donationId)).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  const host = $("#donor-requests");
  if (!host) return;
  if (!requests.length) { host.innerHTML = `<div class="table-empty">No requests yet. Receiver requests will appear here.</div>`; return; }
  host.innerHTML = `<table><thead><tr><th>Food</th><th>Receiver</th><th>Servings</th><th>Request status</th><th>Actions</th></tr></thead><tbody>${requests.map(r => {
    const d = donations.find(item => item.id === r.donationId);
    let actions = "";
    if (r.status === "Pending" && d && d.status !== "Expired" && d.status !== "Collected") actions = `<button class="button primary small" data-request-action="approve" data-id="${escapeHTML(r.id)}">Approve</button><button class="button secondary small" data-request-action="reject" data-id="${escapeHTML(r.id)}">Reject</button>`;
    if (r.status === "Approved" && d?.status !== "Expired" && d?.status !== "Collected") actions = `<span class="small-note">Collection code: <b>${escapeHTML(r.collectionCode)}</b></span><br><button class="button primary small" data-request-action="collect" data-id="${escapeHTML(r.id)}">Confirm collection</button>`;
    if (!actions) actions = `<span class="small-note">No action available</span>`;
    return `<tr><td>${escapeHTML(d?.foodName || "Donation deleted")}</td><td>${escapeHTML(r.receiverName)}<br><span class="small-note">${escapeHTML(r.receiverArea || "")}</span></td><td>${Number(r.quantity)}</td><td>${statusPill(r.status)}</td><td>${actions}</td></tr>`;
  }).join("")}</tbody></table>`;
  $$("[data-request-action]", host).forEach(btn => btn.addEventListener("click", () => handleDonorRequest(btn.dataset.id, btn.dataset.requestAction)));
}
function handleDonorRequest(requestId, action) {
  const user = currentUser();
  const requests = getRequests();
  const donations = getDonations();
  const request = requests.find(r => r.id === requestId);
  const donation = request && donations.find(d => d.id === request.donationId);
  if (!request || !donation || donation.donorId !== user.id) return alert("This request is not linked to your donation.");
  if (action === "approve") {
    if (donation.status === "Expired" || isExpired(donation)) {
      donation.status = "Expired"; setDonations(donations); renderDonor(); return alert("This donation has expired and cannot be approved.");
    }
    if (donation.status === "Collected" || requests.some(r => r.donationId === donation.id && r.status === "Approved")) return alert("This donation already has an approved request.");
    request.status = "Approved";
    request.collectionCode = String(Math.floor(100000 + Math.random()*900000));
    request.updatedAt = new Date().toISOString();
    donation.status = "Approved";
    // Other pending requests for the same donation are rejected to prevent duplicate approval.
    requests.filter(r => r.donationId === donation.id && r.id !== request.id && r.status === "Pending").forEach(r => { r.status = "Rejected"; r.updatedAt = new Date().toISOString(); });
  } else if (action === "reject") {
    if (request.status !== "Pending") return;
    request.status = "Rejected"; request.updatedAt = new Date().toISOString();
    if (!requests.some(r => r.donationId === donation.id && r.status === "Approved") && donation.status !== "Expired" && donation.status !== "Collected" && !isExpired(donation)) donation.status = "Available";
  } else if (action === "collect") {
    if (request.status !== "Approved") return alert("Only an approved request can be collected.");
    const entered = prompt("Enter the 6-digit collection code provided to the receiver:");
    if (entered === null) return;
    if (entered.trim() !== request.collectionCode) return alert("Incorrect collection code. Collection was not recorded.");
    request.status = "Collected"; request.updatedAt = new Date().toISOString();
    donation.status = "Collected"; donation.collectedAt = new Date().toISOString();
  }
  setRequests(requests); setDonations(donations); renderDonor();
}
function matchScore(donation, user) {
  let score = 0, notes = [];
  const area = (user.area || "").toLowerCase();
  const location = (donation.location || "").toLowerCase();
  if (area && location.includes(area)) { score += 100; notes.push("Area matches your profile"); }
  const ms = remainingMs(donation);
  if (ms <= 2*3600000) { score += 40; notes.push("Urgent deadline"); }
  else score += Math.max(0, 20 - Math.floor(ms/3600000));
  score += Math.min(Number(donation.quantity) || 0, 30);
  return { score, note: notes.length ? notes.join(" · ") : "Ranked by urgency and quantity" };
}
function initReceiver() {
  const user = requireRole("receiver");
  if (!user) return;
  setNavUser(user.name);
  renderReceiver(user);
}
function renderReceiver(user) {
  const donations = syncExpired().filter(publicAvailable).map(d => ({ d, match: matchScore(d, user) })).sort((a,b) => b.match.score-a.match.score);
  const host = $("#receiver-donation-list");
  if (host) host.innerHTML = donations.map(({d,match}) => donationCard(d, true, match.note)).join("");
  $("#receiver-empty")?.classList.toggle("hidden", donations.length > 0);
  $$("[data-request]").forEach(btn => btn.addEventListener("click", () => createRequest(btn.dataset.request)));
  renderReceiverRequests(user);
  renderReceiverBadges(user);
}
function createRequest(donationId) {
  const user = currentUser();
  const donations = syncExpired();
  const donation = donations.find(d => d.id === donationId);
  if (!donation || !publicAvailable(donation)) return alert("This donation is no longer available.");
  const already = getRequests().some(r => r.donationId === donationId && r.receiverId === user.id && ["Pending","Approved","Collected"].includes(r.status));
  if (already) return alert("You already have an active or completed request for this donation.");
  const quantity = prompt(`How many servings do you need? Available: ${donation.quantity}`, String(donation.quantity));
  if (quantity === null) return;
  const amount = Number(quantity);
  if (!Number.isInteger(amount) || amount < 1 || amount > Number(donation.quantity)) return alert("Enter a whole number between 1 and the available servings.");
  const request = { id: uid("request"), donationId, receiverId: user.id, receiverName: user.name, receiverArea: user.area, quantity: amount, status: "Pending", createdAt: new Date().toISOString() };
  setRequests([request, ...getRequests()]);
  alert("Request submitted. The donor can now review it.");
  renderReceiver(user);
}
function renderReceiverRequests(user) {
  const requests = getRequests().filter(r => r.receiverId === user.id).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  const host = $("#receiver-requests");
  if (!host) return;
  if (!requests.length) { host.innerHTML = `<div class="table-empty">You haven't requested any food yet.</div>`; return; }
  host.innerHTML = `<table><thead><tr><th>Food</th><th>Servings requested</th><th>Request status</th><th>Collection</th></tr></thead><tbody>${requests.map(r => {
    const d = getDonations().find(item => item.id === r.donationId);
    return `<tr><td>${escapeHTML(d?.foodName || "Donation removed")}<br><span class="small-note">${escapeHTML(d?.location || "")}</span></td><td>${Number(r.quantity)}</td><td>${statusPill(r.status)}</td><td>${r.status === "Approved" ? `Ask donor to confirm your pickup. Code: <b>${escapeHTML(r.collectionCode)}</b>` : r.status === "Collected" ? "Pickup confirmed ✓" : "—"}</td></tr>`;
  }).join("")}</tbody></table>`;
}
function renderReceiverBadges(user) {
  const count = getRequests().filter(r => r.receiverId === user.id && r.status === "Collected").length;
  const badges = [
    { emoji:"🌱", title:"First Step", detail:"Join the food-saving community", unlocked:true },
    { emoji:"🤝", title:"Community Helper", detail:"Complete 5 collections", unlocked:count >= 5 },
    { emoji:"🏅", title:"Meal Champion", detail:"Complete 10 collections", unlocked:count >= 10 }
  ];
  const host = $("#receiver-badges");
  if (host) host.innerHTML = badges.map(b => `<div class="achievement"><span>${b.unlocked ? b.emoji : "🔒"}</span><div><b>${b.title}</b><small>${b.unlocked ? b.detail : `Unlock at ${b.title === "Community Helper" ? 5 : 10} completed collections`}</small></div></div>`).join("");
}
function initAdmin() {
  const user = requireRole("admin");
  if (!user) return;
  setNavUser("Administrator");
  renderAdmin();
  $("#export-csv")?.addEventListener("click", exportCSV);
}
function renderAdmin() {
  const donations = syncExpired();
  const requests = getRequests();
  const users = getUsers();
  const stats = [
    ["Total donations", donations.length, "All listed records"],
    ["Available", donations.filter(d=>d.status==="Available").length, "Can be requested"],
    ["Collected", donations.filter(d=>d.status==="Collected").length, "Pickups confirmed"],
    ["Pending requests", requests.filter(r=>r.status==="Pending").length, "Awaiting donor decision"],
    ["Expired", donations.filter(d=>d.status==="Expired").length, "Deadline has passed"],
    ["Registered users", users.length, "Donors and receivers"],
    ["Meals redistributed", donations.filter(d=>d.status==="Collected").reduce((sum,d)=>sum+(Number(d.quantity)||0),0), "Estimated servings"],
    ["Rejected requests", requests.filter(r=>r.status==="Rejected").length, "Request history"]
  ];
  const statHost = $("#admin-stats");
  if (statHost) statHost.innerHTML = stats.map(([label,value,detail]) => `<article class="stat-card"><span>${escapeHTML(label)}</span><strong>${Number(value).toLocaleString()}</strong><small>${escapeHTML(detail)}</small></article>`).join("");
  const dHost = $("#admin-donations");
  if (dHost) dHost.innerHTML = donations.length ? `<table><thead><tr><th>Food / donor</th><th>Servings</th><th>Location</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead><tbody>${donations.map(d => `<tr><td><b>${escapeHTML(d.foodName)}</b><br><span class="small-note">${escapeHTML(d.donorName)}</span></td><td>${Number(d.quantity)}</td><td>${escapeHTML(d.location)}</td><td>${escapeHTML(formatDate(d.deadline))}</td><td>${statusPill(d.status)}</td><td><button class="button secondary small danger" data-delete-donation="${escapeHTML(d.id)}">Delete</button></td></tr>`).join("")}</tbody></table>` : `<div class="table-empty">No donation records.</div>`;
  $$("[data-delete-donation]").forEach(btn => btn.addEventListener("click", () => deleteDonation(btn.dataset.deleteDonation)));
  const rHost = $("#admin-requests");
  if (rHost) rHost.innerHTML = requests.length ? `<table><thead><tr><th>Food ID</th><th>Receiver</th><th>Servings</th><th>Status</th><th>Requested on</th></tr></thead><tbody>${requests.map(r => `<tr><td>${escapeHTML(getDonations().find(d=>d.id===r.donationId)?.foodName || "Donation deleted")}</td><td>${escapeHTML(r.receiverName)}</td><td>${Number(r.quantity)}</td><td>${statusPill(r.status)}</td><td>${escapeHTML(formatDate(r.createdAt))}</td></tr>`).join("")}</tbody></table>` : `<div class="table-empty">No requests recorded yet.</div>`;
  const categoryCounts = {};
  donations.forEach(d => categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1);
  const topCategory = Object.entries(categoryCounts).sort((a,b)=>b[1]-a[1])[0];
  const analysis = [
    ["Most listed category", topCategory ? `${topCategory[0]} (${topCategory[1]})` : "No data"],
    ["Expired without collection", donations.filter(d=>d.status==="Expired").length],
    ["Approval rate", requests.length ? `${Math.round(requests.filter(r=>["Approved","Collected"].includes(r.status)).length/requests.length*100)}%` : "No requests yet"],
    ["Donations still available", donations.filter(d=>d.status==="Available").length],
    ["Completed requests", requests.filter(r=>r.status==="Collected").length],
    ["Areas represented", new Set(donations.map(d=>d.location.trim().toLowerCase()).filter(Boolean)).size]
  ];
  const aHost = $("#admin-analysis");
  if (aHost) aHost.innerHTML = analysis.map(([label,value]) => `<div class="analysis-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("");
}
function deleteDonation(id) {
  if (currentUser()?.role !== "admin") return alert("Only the admin can delete donations.");
  const donation = getDonations().find(d => d.id === id);
  if (!donation) return;
  if (!confirm(`Permanently delete "${donation.foodName}" and its request history? This cannot be undone.`)) return;
  setDonations(getDonations().filter(d => d.id !== id));
  setRequests(getRequests().filter(r => r.donationId !== id));
  renderAdmin();
}
function exportCSV() {
  if (currentUser()?.role !== "admin") return alert("Admin access required.");
  const donations = getDonations();
  const columns = ["foodName","category","quantity","location","donorName","preparedAt","deadline","storage","allergens","status","createdAt"];
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [columns.join(","), ...donations.map(d => columns.map(key => csvCell(d[key])).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "foodbridge-donations-report.csv";
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function init() {
  seedDemoData();
  addSeedDemoUserNote();
  const page = document.body.dataset.page;
  if (page !== "home") setupLogout();
  if (page === "home") initHome();
  if (page === "register") initRegister();
  if (page === "login") initLogin();
  if (page === "donor") initDonor();
  if (page === "receiver") initReceiver();
  if (page === "admin") initAdmin();
  // Update countdown labels while the page remains open.
  if (page === "home") setInterval(initHome, 60000);
}
document.addEventListener("DOMContentLoaded", init);
