(function () {
  const STORAGE_KEY = "promptLibrary.prompts";
  const form = document.getElementById("promptForm");
  const titleInput = document.getElementById("promptTitle");
  const contentInput = document.getElementById("promptContent");
  const cardsContainer = document.getElementById("promptCards");
  const emptyState = document.getElementById("emptyState");
  const countBadge = document.getElementById("promptCount");

  function loadPrompts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      console.warn("Failed to parse localStorage data", e);
      return [];
    }
  }

  function savePrompts(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function truncateWords(str, maxWords) {
    if (!str) return "";
    const words = str.trim().split(/\s+/);
    if (words.length <= maxWords) return str.trim();
    return words.slice(0, maxWords).join(" ") + "…";
  }

  function render() {
    const prompts = loadPrompts();
    cardsContainer.innerHTML = "";
    if (prompts.length === 0) {
      emptyState.hidden = false;
      countBadge.textContent = "0";
      return;
    }
    emptyState.hidden = true;
    countBadge.textContent = String(prompts.length);
    const fragment = document.createDocumentFragment();
    prompts.forEach((p) => {
      const card = document.createElement("article");
      card.className = "card fade-in";
      card.setAttribute("data-id", p.id);
      const title = document.createElement("h3");
      title.textContent = p.title;
      const preview = document.createElement("p");
      preview.className = "preview";
      preview.textContent = truncateWords(p.content, 15);
      const actions = document.createElement("div");
      actions.className = "actions";
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deletePrompt(p.id));
      actions.appendChild(delBtn);
      card.appendChild(title);
      card.appendChild(preview);
      card.appendChild(actions);
      fragment.appendChild(card);
    });
    cardsContainer.appendChild(fragment);
  }

  function deletePrompt(id) {
    const prompts = loadPrompts();
    const next = prompts.filter((p) => p.id !== id);
    savePrompts(next);
    render();
  }

  function createPrompt(title, content) {
    return {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: title.trim(),
      content: content.trim(),
      createdAt: Date.now(),
    };
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title || !content) {
      return; // native required handles, but double-check
    }
    const prompts = loadPrompts();
    prompts.unshift(createPrompt(title, content)); // newest first
    savePrompts(prompts);
    form.reset();
    titleInput.focus();
    render();
  });

  // Initial render
  render();
})();
