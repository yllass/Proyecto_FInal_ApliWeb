// API base
const API_BASE = "https://portfolio-api-three-black.vercel.app/api/v1";

// -----------------------------
// Mensajes (UI)
// -----------------------------
function mostrarMensaje(texto, tipo = "info") {
  let msg = document.getElementById("msgBox");
  if (!msg) {
    msg = document.createElement("div");
    msg.id = "msgBox";
    document.body.appendChild(msg);
  }
  msg.textContent = texto;
  msg.className = tipo;
  msg.style.display = "block";
}

// -----------------------------
// Utilidades
// -----------------------------
function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// -----------------------------
// Verificar dashboard (protección)
// -----------------------------
function verificarDashboard() {
  const token = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");
  if (!token || !userId || userId === "undefined" || userId === "null") {
    mostrarMensaje("Datos de usuario incompletos. Inicia sesión nuevamente.", "error");
    localStorage.clear();
    setTimeout(() => { window.location.href = "login.html"; }, 900);
    return false;
  }
  return true;
}

// -----------------------------
// LOGIN
// -----------------------------
async function loginUsuario(email, password) {
  if (!email || !password) return mostrarMensaje("Completa todos los campos", "error");
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Credenciales incorrectas");
    // API devuelve token y userPublicData
    if (!data.token || !data.userPublicData) throw new Error("Respuesta de login incompleta");

    localStorage.setItem("authToken", data.token);
    // guardamos tanto userId como objeto user para mostrar nombre si hace falta
    localStorage.setItem("userId", data.userPublicData.id ?? data.userPublicData._id ?? "");
    localStorage.setItem("user", JSON.stringify(data.userPublicData));

    mostrarMensaje("✅ Sesión iniciada", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
  } catch (err) {
    console.error("Login error:", err);
    mostrarMensaje("❌ " + (err.message || "Error al iniciar sesión"), "error");
  }
}

// -----------------------------
// REGISTER
// -----------------------------
async function registrarUsuario(name, email, itsonId, password) {
  if (!name || !email || !itsonId || !password) return mostrarMensaje("Completa todos los campos", "error");
  if (itsonId.length !== 6) return mostrarMensaje("ID ITSON debe tener 6 dígitos", "error");

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, itsonId, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al registrar");
    mostrarMensaje("✅ Registro exitoso. Inicia sesión.", "success");
    setTimeout(() => { window.location.href = "login.html"; }, 900);
  } catch (err) {
    console.error("Register error:", err);
    mostrarMensaje("❌ " + (err.message || "Error al registrar"), "error");
  }
}

// -----------------------------
// LOGOUT
// -----------------------------
function cerrarSesion() {
  localStorage.clear();
  window.location.href = "login.html";
}

// -----------------------------
// CRUD: proyectos
// -----------------------------
let editId = null; // id del proyecto que estamos editando (si hay)

// cargar proyectos del usuario
async function loadProjects() {
  const token = localStorage.getItem("authToken");
  if (!token) return;
  const listEl = document.getElementById("project-list");
  if (!listEl) return;
  listEl.innerHTML = "<p>Cargando...</p>";

  try {
    const res = await fetch(`${API_BASE}/projects`, {
      headers: { "auth-token": token }
    });
    if (!res.ok) {
      // si token inválido, guiamos a login
      const errData = await res.json().catch(()=>({}));
      throw new Error(errData.message || "No autorizado");
    }
    const data = await res.json();
    listEl.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      listEl.innerHTML = "<p>No hay proyectos todavía.</p>";
      return;
    }

    data.forEach(p => {
      const card = document.createElement("div");
      card.className = "project-card";
      // estructura: título arriba, descripción debajo, botones en fila
      card.innerHTML = `
        <div class="project-info">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description)}</p>
        </div>
        <div class="project-actions">
          <button class="btn-edit" onclick="openEdit('${p._id}', '${escapeForAttr(p.title)}', '${escapeForAttr(p.description)}')">Editar</button>
          <button class="btn-delete" onclick="deleteProject('${p._id}')">Eliminar</button>
        </div>
      `;
      listEl.appendChild(card);
    });
  } catch (err) {
    console.error("loadProjects error:", err);
    mostrarMensaje("❌ " + (err.message || "Error al cargar proyectos"), "error");
    // si la razón es auth, limpiar y volver al login
    if (err.message && /autoriz/i.test(err.message)) {
      localStorage.clear();
      setTimeout(()=> window.location.href = "login.html", 900);
    }
  }
}

// abrir modal para editar (expuesto globalmente)
window.openEdit = (id, title, desc) => {
  editId = id;
  const modal = document.getElementById("modal");
  if (!modal) return;
  document.getElementById("modal-title").textContent = "Editar Proyecto";
  document.getElementById("projName").value = unescapeAttr(title);
  document.getElementById("projDesc").value = unescapeAttr(desc);
  modal.classList.remove("hidden");
};

// eliminar proyecto
async function deleteProject(id) {
  const token = localStorage.getItem("authToken");
  if (!token) return mostrarMensaje("Inicia sesión", "error");
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: "DELETE",
      headers: { "auth-token": token }
    });
    if (!res.ok) {
      const errData = await res.json().catch(()=>({}));
      throw new Error(errData.message || "Error al eliminar proyecto");
    }
    mostrarMensaje("Proyecto eliminado", "success");
    loadProjects();
  } catch (err) {
    console.error("deleteProject error:", err);
    mostrarMensaje("❌ " + (err.message || "Error al eliminar proyecto"), "error");
  }
}

// guardar proyecto (crear o actualizar)
async function saveProject() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    mostrarMensaje("Sesión inválida. Inicia sesión de nuevo.", "error");
    localStorage.clear();
    setTimeout(() => window.location.href = "login.html", 900);
    return;
  }

  const title = document.getElementById("projName")?.value.trim();
  const description = document.getElementById("projDesc")?.value.trim();

  if (!title || !description) {
    mostrarMensaje("Completa todos los campos", "error");
    return;
  }

  // ESTA ES LA DIFERENCIA: SOLO MANDAMOS LOS CAMPOS QUE LA API ACEPTA
  const body = {
    title,
    description
  };

  let url = `${API_BASE}/projects`;
  let method = "POST";

  if (editId) {
    url = `${API_BASE}/projects/${editId}`;
    method = "PUT";
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "auth-token": token
      },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "Error al guardar proyecto");
    }

    mostrarMensaje("Proyecto guardado ✔️", "success");
    document.getElementById("modal")?.classList.add("hidden");
    editId = null;

    loadProjects();
  } catch (err) {
    console.error("saveProject error:", err);
    mostrarMensaje("❌ " + err.message, "error");

    if (/token|expire|auth/i.test(err.message)) {
      localStorage.clear();
      setTimeout(() => window.location.href = "login.html", 900);
    }
  }
}


// -----------------------------
// Helpers para evitar inyección en atributos y HTML simple
// -----------------------------
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeForAttr(str = "") {
  // encode quotes and newlines to keep inside single-quoted onclick strings
  return String(str).replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
}
function unescapeAttr(str = "") {
  return String(str).replace(/\\'/g, "'").replace(/\\n/g, "\n");
}

// -----------------------------
// DOMContentLoaded: enlazar formularios y botones
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // LOGIN form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value;
      const password = document.getElementById("password")?.value;
      loginUsuario(email, password);
    });
  }

  // REGISTER form
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name")?.value;
      const email = document.getElementById("email")?.value;
      const itsonId = document.getElementById("itsonId")?.value;
      const password = document.getElementById("password")?.value;
      registrarUsuario(name, email, itsonId, password);
    });
  }

  // LOGOUT button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", cerrarSesion);

  // DASHBOARD protection + load projects
  if (window.location.pathname.includes("dashboard.html")) {
    if (verificarDashboard()) {
      // mostrar nombre (si está guardado)
      const userStr = safeParse(localStorage.getItem("user"));
      const titleEl = document.querySelector(".dashboard-title") || document.getElementById("welcomeText");
      if (userStr && userStr.name && titleEl) {
        // si hay un título (dashboard-title) no sobreescribimos, solo opcional
        // titleEl.textContent = "Bienvenido, " + userStr.name;
      }
      // cargar proyectos
      loadProjects();
    }
  }

  // Botón agregar proyecto (modal)
  const btnAddProject = document.getElementById("btnAddProject");
  if (btnAddProject) {
    btnAddProject.addEventListener("click", () => {
      editId = null;
      document.getElementById("modal-title").textContent = "Nuevo Proyecto";
      document.getElementById("projName").value = "";
      document.getElementById("projDesc").value = "";
      document.getElementById("modal")?.classList.remove("hidden");
    });
  }

  // cerrar modal
  const closeModalBtn = document.getElementById("closeModal");
  if (closeModalBtn) closeModalBtn.addEventListener("click", () => document.getElementById("modal")?.classList.add("hidden"));

  // guardar proyecto
  const saveProjectBtn = document.getElementById("saveProject");
  if (saveProjectBtn) saveProjectBtn.addEventListener("click", (e) => { e.preventDefault(); saveProject(); });
});
