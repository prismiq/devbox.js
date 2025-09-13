/**
 * DevBox.js - Utility Console
 * https://weareprismic.com
 * Contact: jason@weareprismic.com
 *
 * This script injects a lightweight developer console into any webpage.
 * It provides a toggleable panel that captures and displays:
 *  - Form submissions (intercepted and logged with field data)
 *  - Fetch/XHR network requests (method, URL, body, response)
 *  - Session, cookies, and page info
 *  - Persistent logs stored in localStorage (survive page reloads)
 *
 * Features:
 *  - Sidebar list of logged events with timestamps
 *  - Main view for inspecting detailed JSON/object data
 *  - Clear logs button to reset view and localStorage
 *  - Toggle visibility via the bottom-left tab or Ctrl/⌘ + `
 *  - Public API (window.DevBox) for programmatic control (open, close, toggle, clear)
 *
 * Intended for debugging client-side activity in real-time without
 * opening browser dev tools. Ideal for QA, form testing, and API inspection.
 */

(function () {
  if (window.__DEVBOX_LOADED__) return;
  window.__DEVBOX_LOADED__ = true;

  let visible = false;
  let blockRedirects = false;
  let stopSubmit = true;

  const devBox = document.createElement("div");
  devBox.id = "devbox-console";
  devBox.setAttribute(
    "style",
    [
      "position:fixed",
      "left:0",
      "right:0",
      "bottom:0",
      "z-index:2147483646",
      "background:rgba(20,20,30,0.98)",
      "color:#fff",
      "font-family:monospace",
      "font-size:13px",
      "height:40vh",
      "display:none",
      "border-top:2px solid #6d28d9",
      "box-shadow:0 -2px 12px #0008",
    ]
      .map((s) => s + " !important")
      .join(";")
  );

  const devBoxTab = document.createElement("div");
  devBoxTab.textContent = "DevBox Console";
  Object.assign(devBoxTab.style, {
    position: "fixed",
    bottom: "0",
    left: "0",
    background: "#6d28d9",
    color: "#fff",
    padding: "6px 16px",
    cursor: "pointer",
    zIndex: 2147483647,
    fontWeight: "bold",
    borderTopRightRadius: "6px",
  });
  devBoxTab.onclick = () => {
    visible = !visible;
    devBox.style.display = visible ? "flex" : "none";
  };

  document.body.appendChild(devBoxTab);

  const sidebar = document.createElement("div");
  sidebar.style.width = "40%";
  sidebar.style.overflowY = "auto";
  sidebar.style.padding = "8px";
  sidebar.style.borderRight = "2px solid #333";

  const mainView = document.createElement("div");
  mainView.style.width = "60%";
  mainView.style.overflowY = "auto";
  mainView.style.padding = "8px";
  mainView.style.background = "#111827";
  mainView.style.color = "#a7f3d0";
  mainView.style.fontFamily = "monospace";
  mainView.style.whiteSpace = "pre-wrap";

  devBox.style.flexDirection = "row";

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear Logs";
  Object.assign(clearBtn.style, {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "4px 12px",
    fontWeight: "bold",
    cursor: "pointer",
    position: "absolute",
    top: "4px",
    right: "8px",
    zIndex: 2147483648,
  });
  clearBtn.onclick = () => {
    sidebar.innerHTML = "";
    mainView.innerHTML = "";
    localStorage.removeItem("__DEVBOX_LOGS");
  };

  devBox.appendChild(sidebar);
  devBox.appendChild(mainView);
  devBox.appendChild(clearBtn);

  let logEntries = JSON.parse(localStorage.getItem("__DEVBOX_LOGS") || "[]");

  function addLogEntry(title, obj) {
    const id = Date.now().toString();
    const timestamp = new Date().toLocaleTimeString();
    const label = `[${timestamp}] ${title}`;
    const section = document.createElement("div");
    section.style.borderBottom = "1px solid #444";
    section.style.padding = "4px";
    section.style.cursor = "pointer";
    section.textContent = label;
    section.onclick = () => {
      mainView.innerHTML = Object.keys(obj).length
        ? JSON.stringify(obj, null, 2)
        : "";
    };
    sidebar.prepend(section);
    logEntries.push({ title: label, obj });
    localStorage.setItem("__DEVBOX_LOGS", JSON.stringify(logEntries));
  }

  logEntries.forEach((entry) => {
    const section = document.createElement("div");
    section.style.borderBottom = "1px solid #444";
    section.style.padding = "4px";
    section.style.cursor = "pointer";
    section.textContent = entry.title;
    section.onclick = () => {
      mainView.innerHTML = Object.keys(entry.obj).length
        ? JSON.stringify(entry.obj, null, 2)
        : "";
    };
    sidebar.appendChild(section);
  });

  document.addEventListener(
    "submit",
    (e) => {
      if (stopSubmit && e.target instanceof HTMLFormElement) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const formData = {};
        for (const [k, v] of fd.entries()) {
          formData[k] = v;
        }
        addLogEntry(
          "[FORM SUBMIT] " + (e.target.action || window.location.pathname),
          formData
        );
      }
    },
    true
  );

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const [url, opts] = args;
    const method = opts?.method || "GET";
    const body = opts?.body;
    let entry = { method, url };
    if (body) {
      try {
        entry.body = typeof body === "string" ? JSON.parse(body) : body;
      } catch {
        entry.body = body;
      }
    }
    const resp = await origFetch.apply(this, args);
    const clone = resp.clone();
    let respText = "";
    try {
      respText = await clone.text();
    } catch {}
    try {
      entry.response = JSON.parse(respText);
    } catch {
      entry.response = respText;
    }
    addLogEntry(`[${method}] ${url}`, entry);
    return resp;
  };

  // Static info: session, cookies, pathname
  addLogEntry("[SESSION]", window.__DEVBOX_SESSION || {});
  addLogEntry(
    "[COOKIES]",
    document.cookie.split(";").reduce((acc, c) => {
      let [k, v] = c.split("=");
      if (k && v) acc[k.trim()] = decodeURIComponent(v);
      return acc;
    }, {})
  );
  addLogEntry("[PAGE]", { pathname: window.location.pathname });

  window.DevBox = {
    open: () => {
      visible = true;
      devBox.style.display = "flex";
    },
    close: () => {
      visible = false;
      devBox.style.display = "none";
    },
    toggle: () => {
      visible = !visible;
      devBox.style.display = visible ? "flex" : "none";
    },
    isOpen: () => visible,
    clear: () => {
      sidebar.innerHTML = "";
      mainView.innerHTML = "";
      logEntries = [];
      localStorage.removeItem("__DEVBOX_LOGS");
    },
    setBlockRedirects: (val) => {
      blockRedirects = !!val;
    },
  };

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "`") window.DevBox.toggle();
  });

  document.body.appendChild(devBox);
})();
