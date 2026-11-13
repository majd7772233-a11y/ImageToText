/* ImageToText — navigation and per-tool workspace shell */
(function () {
  "use strict";

  const tools = Array.isArray(toolCatalog) ? toolCatalog : [];
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  const categoryNames = {
    images: "الصور وOCR",
    pdf: "ملفات PDF",
    office: "المستندات والجداول",
    codes: "QR والباركود"
  };
  const iconById = {
    "image-translator": "文",
    "pdf-to-word": "PDF",
    "jpg-to-word": "▧",
    "jpg-to-pdf": "▤",
    "qr-code-scanner": "⌗",
    "pdf-to-text": "T",
    "text-to-pdf": "T",
    "text-to-word": "W",
    "invert-image": "◐",
    "text-to-image": "▧",
    "word-to-pdf": "W",
    "pdf-to-jpg": "▧",
    "merge-pdf": "⊕",
    "jpg-to-excel": "▦",
    "qr-code-generator": "⌗",
    "word-to-jpg": "W",
    "pdf-to-excel": "▦",
    "barcode-scanner": "▥",
    "excel-to-jpg": "▧",
    "pdf-to-csv": "CSV",
    "html-to-pdf": "</>",
    "pdf-to-html": "</>",
    "batch-image-to-text": "✧",
    "word-to-excel": "W",
    "ppt-to-pdf": "P",
    "csv-to-excel": "CSV",
    "excel-to-csv": "CSV",
    "excel-to-pdf": "▤",
    "image-to-text": "OCR"
  };

  const byIdElement = (id) => document.getElementById(id);
  const grid = byIdElement("toolGrid");
  const nav = byIdElement("toolNavList");
  const homeScreen = byIdElement("homeScreen");
  const toolScreen = byIdElement("toolScreen");
  const search = byIdElement("toolSearch");
  const emptyState = byIdElement("emptySearchState");
  const visibleToolCount = byIdElement("visibleToolCount");
  const categoryButtons = Array.from(document.querySelectorAll("[data-category-filter]"));
  let activeCategory = "all";
  let activeTool = null;
  let previewObjectUrl = null;
  const catalogCounts = { all: tools.length, images: 0, pdf: 0, office: 0, codes: 0 };
  tools.forEach((tool) => { catalogCounts[categoryFor(tool.id)] += 1; });
  Object.keys(catalogCounts).forEach((category) => {
    const count = document.querySelector('[data-category-count="' + category + '"]');
    if (count) count.textContent = String(catalogCounts[category]);
  });

  if (!grid || !nav || !homeScreen || !toolScreen) return;

  function categoryFor(toolId) {
    if (toolId.indexOf("qr-") === 0 || toolId.indexOf("barcode-") === 0) return "codes";
    if (toolId.indexOf("pdf") !== -1) return "pdf";
    if (
      toolId.indexOf("image") !== -1 ||
      toolId.indexOf("jpg") !== -1 ||
      toolId.indexOf("invert") !== -1 ||
      toolId.indexOf("batch") !== -1
    ) return "images";
    return "office";
  }

  function iconFor(tool) {
    return iconById[tool.id] || (categoryFor(tool.id) === "pdf" ? "PDF" : "✦");
  }

  function decorateCards() {
    tools.forEach((tool) => {
      const card = grid.querySelector('[data-tool="' + tool.id + '"]');
      if (!card) return;
      card.dataset.category = categoryFor(tool.id);
      card.classList.add("liquid-tool-card");
      const title = card.querySelector("strong");
      const description = card.querySelector("small");
      const icon = document.createElement("span");
      const copy = document.createElement("span");
      icon.className = "tool-card-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = iconFor(tool);
      copy.className = "tool-card-copy";
      if (title) copy.appendChild(title);
      if (description) copy.appendChild(description);
      card.replaceChildren(icon, copy);
      card.setAttribute("aria-label", tool.name + " — " + tool.desc);
      card.setAttribute("aria-pressed", "false");
      card.addEventListener("pointermove", function (event) {
        if (event.pointerType === "touch") return;
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        card.style.setProperty("--pointer-x", x.toFixed(1) + "%");
        card.style.setProperty("--pointer-y", y.toFixed(1) + "%");
      });
      card.addEventListener("pointerleave", function () {
        card.style.removeProperty("--pointer-x");
        card.style.removeProperty("--pointer-y");
      });

    });
  }

  function renderSidebar() {
    nav.replaceChildren();
    tools.forEach((tool) => {
      const button = document.createElement("button");
      const icon = document.createElement("span");
      const label = document.createElement("span");
      button.type = "button";
      button.className = "sidebar-tool";
      button.dataset.toolNav = tool.id;
      button.dataset.category = categoryFor(tool.id);
      button.setAttribute("aria-label", tool.name + " — " + tool.desc);
      icon.className = "sidebar-tool-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = iconFor(tool);
      label.className = "sidebar-tool-label";
      label.textContent = tool.name;
      button.append(icon, label);
      button.addEventListener("click", function () {
        const card = grid.querySelector('[data-tool="' + tool.id + '"]');
        if (card) card.click();
      });
      nav.appendChild(button);
    });
    const count = byIdElement("toolCount");
    if (count) count.textContent = String(tools.length);
  }

  function normalizeSearch(value) {
    return String(value || "").toLocaleLowerCase().trim();
  }

  function applyFilters() {
    const query = normalizeSearch(search ? search.value : "");
    let visible = 0;
    tools.forEach((tool) => {
      const category = categoryFor(tool.id);
      const haystack = normalizeSearch(tool.id + " " + tool.name + " " + tool.desc + " " + categoryNames[category]);
      const matchesQuery = !query || haystack.indexOf(query) !== -1;
      const matchesCategory = activeCategory === "all" || activeCategory === category;
      const show = matchesQuery && matchesCategory;
      const card = grid.querySelector('[data-tool="' + tool.id + '"]');
      const navButton = nav.querySelector('[data-tool-nav="' + tool.id + '"]');
      if (card) card.hidden = !show;
      if (navButton) navButton.hidden = !show;
      if (show) visible += 1;
    });
    if (emptyState) emptyState.hidden = visible > 0;
    if (visibleToolCount) visibleToolCount.textContent = String(visible);
    categoryButtons.forEach((button) => {
      const active = button.dataset.categoryFilter === activeCategory;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      if (button.classList.contains("sidebar-nav-item")) {
        button.classList.toggle("is-active", active);
      }
    });
  }

  function closeMobileSidebar() {
    document.body.classList.remove("sidebar-open");
    const toggle = byIdElement("sidebarToggle");
    const backdrop = byIdElement("sidebarBackdrop");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (backdrop) backdrop.hidden = true;
  }

  function openToolScreen(toolId) {
    const tool = byId.get(toolId);
    if (!tool) return;
    activeTool = tool;
    homeScreen.hidden = true;
    toolScreen.hidden = false;
    byIdElement("activeToolName").textContent = tool.name;
    byIdElement("activeToolDesc").textContent = tool.desc;
    byIdElement("activeToolIcon").textContent = iconFor(tool);
    byIdElement("activeToolCategory").textContent = categoryNames[categoryFor(tool.id)];
    byIdElement("breadcrumbCurrent").textContent = tool.name;
    document.title = tool.name + " — ImageToText";
    document.body.dataset.activeTool = tool.id;
    const homeButton = byIdElement("homeNavButton");
    if (homeButton) homeButton.classList.remove("is-active");
    nav.querySelectorAll(".sidebar-tool").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.toolNav === tool.id);
    });
    tools.forEach((item) => {
      const card = grid.querySelector('[data-tool="' + item.id + '"]');
      if (!card) return;
      const selected = item.id === tool.id;
      card.classList.toggle("active", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
    closeMobileSidebar();
  }

  function showHome() {
    activeTool = null;
    homeScreen.hidden = false;
    toolScreen.hidden = true;
    byIdElement("breadcrumbCurrent").textContent = "الرئيسية";
    document.title = "ImageToText — مساحة العمل";
    delete document.body.dataset.activeTool;
    const homeButton = byIdElement("homeNavButton");
    if (homeButton) homeButton.classList.add("is-active");
    nav.querySelectorAll(".sidebar-tool").forEach((button) => button.classList.remove("is-active"));
    closeMobileSidebar();
  }

  function setCategory(category) {
    activeCategory = category || "all";
    applyFilters();
  }

  decorateCards();
  renderSidebar();
  applyFilters();

  window.openToolScreen = openToolScreen;

  grid.addEventListener("click", function (event) {
    const card = event.target.closest(".tool-card");
    if (card && card.dataset.tool) openToolScreen(card.dataset.tool);
  }, true);

  categoryButtons.forEach((button) => {
    button.addEventListener("click", function () {
      setCategory(button.dataset.categoryFilter);
    });
  });

  if (search) {
    search.addEventListener("input", applyFilters);
    search.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        search.value = "";
        applyFilters();
        search.blur();
      }
    });
  }

  const exploreTools = byIdElement("exploreToolsBtn");
  if (exploreTools) exploreTools.addEventListener("click", function () {
    const library = byIdElement("librarySection");
    if (library) library.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  });

  const homeButton = byIdElement("homeNavButton");
  if (homeButton) homeButton.addEventListener("click", showHome);
  const backButton = byIdElement("backToHome");
  if (backButton) backButton.addEventListener("click", showHome);

  const startOcr = byIdElement("startOcrBtn");
  if (startOcr) {
    startOcr.addEventListener("click", function () {
      setCategory("all");
      const ocrCard = grid.querySelector('[data-tool="image-to-text"]');
      if (ocrCard) ocrCard.click();
    });
  }

  const sidebarToggle = byIdElement("sidebarToggle");
  const sidebarBackdrop = byIdElement("sidebarBackdrop");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      const isOpen = document.body.classList.toggle("sidebar-open");
      sidebarToggle.setAttribute("aria-expanded", String(isOpen));
      if (sidebarBackdrop) sidebarBackdrop.hidden = !isOpen;
    });
  }
  if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  const fileInput = byIdElement("fileInput");
  const previewImage = byIdElement("previewImage");
  const placeholder = byIdElement("placeholder");
  if (fileInput && previewImage && placeholder) {
    fileInput.addEventListener("change", function () {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
      if (files.length === 1 && files[0].type && files[0].type.indexOf("image/") === 0) {
        previewObjectUrl = URL.createObjectURL(files[0]);
        previewImage.src = previewObjectUrl;
        previewImage.style.display = "block";
        placeholder.style.display = "none";
      } else {
        previewImage.removeAttribute("src");
        previewImage.style.display = "none";
        placeholder.innerHTML = "";
        const symbol = document.createElement("span");
        const label = document.createElement("span");
        symbol.className = "placeholder-symbol";
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = files.length > 1 ? "▤" : "▧";
        label.textContent = files.length > 1 ? "تم اختيار " + files.length + " ملفات" : files[0].name;
        placeholder.append(symbol, label);
        placeholder.style.display = "flex";
      }
    }, true);
  }

  const clearButton = byIdElement("clearBtn");
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
      placeholder.innerHTML = '<span class="placeholder-symbol" aria-hidden="true">▧</span><span>ستظهر معاينة الملف هنا</span>';
    });
  }

  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (search) search.focus();
    }
    if (event.key === "Escape" && document.body.classList.contains("sidebar-open")) {
      closeMobileSidebar();
    }
  });
})();