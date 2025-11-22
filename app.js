(function () {
  const STORAGE_KEY = "promptLibrary.prompts";
  const form = document.getElementById("promptForm");
  const titleInput = document.getElementById("promptTitle");
  const contentInput = document.getElementById("promptContent");
  const cardsContainer = document.getElementById("promptCards");
  const emptyState = document.getElementById("emptyState");
  const countBadge = document.getElementById("promptCount");
  const ratingFilterSelect = document.getElementById("ratingFilter");
  let ratingFilterMin = 0; // 0 = show all

  function loadPrompts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Ensure rating field exists
        return parsed.map((p) => ({
          ...p,
          rating: typeof p.rating === "number" ? p.rating : 0,
        }));
      }
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
    const filtered =
      ratingFilterMin > 0
        ? prompts.filter((p) => (p.rating || 0) >= ratingFilterMin)
        : prompts;
    countBadge.textContent = String(filtered.length);
    const fragment = document.createDocumentFragment();
    filtered.forEach((p) => {
      const card = document.createElement("article");
      card.className = "card fade-in";
      card.setAttribute("data-id", p.id);
      const title = document.createElement("h3");
      title.textContent = p.title;
      const preview = document.createElement("p");
      preview.className = "preview";
      preview.textContent = truncateWords(p.content, 15);
      const ratingEl = createStarRatingComponent(p);
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
      card.appendChild(ratingEl);
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
      rating: 0,
    };
  }

  function setPromptRating(id, stars) {
    const prompts = loadPrompts();
    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) return;
    const clamped = Math.min(5, Math.max(1, stars));
    prompt.rating = clamped;
    savePrompts(prompts);
    render();
  }

  function createStarRatingComponent(prompt) {
    const wrapper = document.createElement("div");
    wrapper.className = "star-rating";
    wrapper.setAttribute("role", "radiogroup");
    wrapper.setAttribute("aria-label", `Rate prompt: ${prompt.title}`);
    let hoverValue = 0;
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star";
      btn.setAttribute("data-value", String(i));
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", prompt.rating === i ? "true" : "false");
      btn.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
      updateStarVisual(btn, i, prompt.rating, hoverValue);
      btn.addEventListener("mouseenter", () => {
        hoverValue = i;
        refreshStars(wrapper, prompt.rating, hoverValue);
      });
      btn.addEventListener("mouseleave", () => {
        hoverValue = 0;
        refreshStars(wrapper, prompt.rating, hoverValue);
      });
      btn.addEventListener("click", () => setPromptRating(prompt.id, i));
      btn.addEventListener("keydown", (e) => {
        if (["ArrowRight", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          setPromptRating(
            prompt.id,
            (prompt.rating || 0) + 1 > 5 ? 5 : (prompt.rating || 0) + 1
          );
        } else if (["ArrowLeft", "ArrowDown"].includes(e.key)) {
          e.preventDefault();
          setPromptRating(
            prompt.id,
            (prompt.rating || 1) - 1 < 1 ? 1 : (prompt.rating || 1) - 1
          );
        } else if (["Enter", " "].includes(e.key)) {
          e.preventDefault();
          setPromptRating(prompt.id, i);
        }
      });
      wrapper.appendChild(btn);
    }
    return wrapper;
  }

  function refreshStars(wrapper, currentRating, hoverValue) {
    const stars = wrapper.querySelectorAll(".star");
    stars.forEach((star) => {
      const value = Number(star.getAttribute("data-value"));
      updateStarVisual(star, value, currentRating, hoverValue);
    });
  }

  function updateStarVisual(el, starValue, currentRating, hoverValue) {
    const activeBoundary = hoverValue > 0 ? hoverValue : currentRating;
    if (starValue <= activeBoundary) {
      el.classList.add("filled");
      el.textContent = "★";
    } else {
      el.classList.remove("filled");
      el.textContent = "☆";
    }
  }

  function handleRatingFilterChange() {
    ratingFilterMin = Number(ratingFilterSelect.value) || 0;
    render();
  }

  if (ratingFilterSelect) {
    ratingFilterSelect.addEventListener("change", handleRatingFilterChange);
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
