const API_BASE = "https://portfolio-api-three-black.vercel.app/api/v1";

// Mostrar mensajes
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
  setTimeout(() => { msg.style.display = "none"; }, 4000);
}

// LOGIN / REGISTER / LOGOUT
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error("Credenciales incorrectas");

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userId", data.userPublicData.id);

        mostrarMensaje("✅ Sesión iniciada", "success");
        setTimeout(() => (window.location.href = "dashboard.html"), 1000);
      } catch (error) {
        mostrarMensaje("❌ " + error.message, "error");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const itsonId = document.getElementById("itsonId").value;
      const password = document.getElementById("password").value;

      if (itsonId.length !== 6) return mostrarMensaje("ID ITSON debe tener 6 dígitos", "error");

      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, itsonId, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error al registrar");

        mostrarMensaje("✅ Registro exitoso. Inicia sesión.", "success");
        setTimeout(() => (window.location.href = "login.html"), 1000);
      } catch (error) {
        mostrarMensaje("❌ " + error.message, "error");
      }
    });
  }

  if (window.location.pathname.includes("dashboard.html")) {
    const token = localStorage.getItem("authToken");
    if (!token) window.location.href = "login.html";
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "login.html";
    });
  }

  // ================== CRUD ==================
  const btnAddProject = document.getElementById("btnAddProject");
  const modal = document.getElementById("modal");
  const closeModalBtn = document.getElementById("closeModal");
  const saveProjectBtn = document.getElementById("saveProject");
  const projectList = document.getElementById("project-list");

  let editId = null;

  async function loadProjects() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/projects`, {
        headers: { "auth-token": token }
      });
      const data = await res.json();
      projectList.innerHTML = "";

      data.forEach(p => {
        const card = document.createElement("div");
        card.className = "project-card";
        card.innerHTML = `
          <h3>${p.title}</h3>
          <p>${p.description}</p>
          <button class="btn-edit" onclick="openEdit('${p._id}', '${p.title}', '${p.description}')">Editar</button>
          <button class="btn-delete" onclick="deleteProject('${p._id}')">Eliminar</button>
        `;
        projectList.appendChild(card);
      });
    } catch (err) {
      console.error(err);
    }
  }

  window.openEdit = (id, title, desc) => {
    editId = id;
    document.getElementById("modal-title").textContent = "Editar Proyecto";
    document.getElementById("projName").value = title;
    document.getElementById("projDesc").value = desc;
    modal.classList.remove("hidden");
  };

  window.deleteProject = async (id) => {
    const token = localStorage.getItem("authToken");
    await fetch(`${API_BASE}/projects/${id}`, {
      method: "DELETE",
      headers: { "auth-token": token }
    });
    loadProjects();
  };

  if (btnAddProject) {
    btnAddProject.addEventListener("click", () => {
      editId = null;
      document.getElementById("modal-title").textContent = "Nuevo Proyecto";
      document.getElementById("projName").value = "";
      document.getElementById("projDesc").value = "";
      modal.classList.remove("hidden");
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (saveProjectBtn) {
    saveProjectBtn.addEventListener("click", async () => {
      const token = localStorage.getItem("authToken");
      const body = {
        title: document.getElementById("projName").value,
        description: document.getElementById("projDesc").value
      };

      let url = `${API_BASE}/projects`;
      let method = "POST";
      if (editId) {
        url = `${API_BASE}/projects/${editId}`;
        method = "PUT";
      }

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "auth-token": token
        },
        body: JSON.stringify(body)
      });

      modal.classList.add("hidden");
      loadProjects();
    });
  }

  if (window.location.pathname.includes("dashboard.html")) {
    loadProjects();
  }
});
