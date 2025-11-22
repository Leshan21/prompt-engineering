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
  const NOTES_MAX = 20;
  const NOTES_CHAR_MAX = 500;
  const notesErrorState = {}; // {promptId: boolean}

  function notesStorageKey(promptId) {
    return `promptNotes:${promptId}`;
  }

  function loadNotes(promptId) {
    try {
      const raw = localStorage.getItem(notesStorageKey(promptId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (n) => typeof n === "object" && n && typeof n.content === "string"
      );
    } catch (e) {
      console.warn("Failed to parse notes", promptId, e);
      return [];
    }
  }

  function persistNotes(promptId, notes) {
    try {
      localStorage.setItem(notesStorageKey(promptId), JSON.stringify(notes));
      notesErrorState[promptId] = false;
      return true;
    } catch (e) {
      notesErrorState[promptId] = true;
      return false;
    }
  }

  function createNote(content) {
    return {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2),
      content: content.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

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
      // Notes section
      const notesWrapper = document.createElement("div");
      notesWrapper.className = "notes";
      notesWrapper.setAttribute("data-notes-wrapper", p.id);
      const notesHeader = document.createElement("div");
      notesHeader.className = "notes-header";
      const h4 = document.createElement("h4");
      h4.textContent = "Notes";
      const notesCount = document.createElement("span");
      notesCount.className = "count-badge";
      const existingNotes = loadNotes(p.id);
      notesCount.textContent = String(existingNotes.length);
      notesHeader.appendChild(h4);
      notesHeader.appendChild(notesCount);
      const formEl = document.createElement("form");
      formEl.className = "note-form";
      formEl.setAttribute("data-note-form", p.id);
      formEl.autocomplete = "off";
      const textarea = document.createElement("textarea");
      textarea.name = "noteContent";
      textarea.maxLength = NOTES_CHAR_MAX;
      textarea.placeholder = "Add a note (tips, variations, context)...";
      const meta = document.createElement("div");
      meta.className = "note-meta";
      const charCount = document.createElement("span");
      charCount.textContent = `0 / ${NOTES_CHAR_MAX}`;
      const saveBtn = document.createElement("button");
      saveBtn.type = "submit";
      saveBtn.className = "btn primary save-note-btn";
      saveBtn.textContent = "Save Note";
      saveBtn.disabled = true;
      meta.appendChild(charCount);
      meta.appendChild(saveBtn);
      formEl.appendChild(textarea);
      formEl.appendChild(meta);
      const limitWarning = document.createElement("p");
      limitWarning.className = "notes-limit-warning";
      if (existingNotes.length >= NOTES_MAX) {
        limitWarning.textContent = "Max notes reached.";
        formEl.hidden = true;
      }
      const errorBanner = document.createElement("div");
      errorBanner.className = "notes-error-banner";
      errorBanner.hidden = !notesErrorState[p.id];
      errorBanner.textContent = "Storage full. Changes not saved.";
      const ul = document.createElement("ul");
      ul.className = "notes-list";
      ul.setAttribute("data-notes-list", p.id);
      existingNotes.forEach((n) => {
        ul.appendChild(renderNoteItem(p.id, n));
      });
      notesWrapper.appendChild(notesHeader);
      notesWrapper.appendChild(formEl);
      if (limitWarning.textContent) notesWrapper.appendChild(limitWarning);
      notesWrapper.appendChild(errorBanner);
      notesWrapper.appendChild(ul);
      // Events
      textarea.addEventListener("input", () => {
        const val = textarea.value;
        charCount.textContent = `${val.length} / ${NOTES_CHAR_MAX}`;
        saveBtn.disabled = val.trim().length === 0;
      });
      formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        const content = textarea.value.trim();
        if (!content) return;
        const current = loadNotes(p.id);
        if (current.length > 0) {
          const last = current[current.length - 1];
          if (last.content.trim().toLowerCase() === content.toLowerCase()) {
            return; // duplicate consecutive
          }
        }
        if (current.length >= NOTES_MAX) return;
        current.push(createNote(content));
        if (!persistNotes(p.id, current)) {
          errorBanner.hidden = false;
          return;
        }
        textarea.value = "";
        charCount.textContent = `0 / ${NOTES_CHAR_MAX}`;
        saveBtn.disabled = true;
        notesCount.textContent = String(current.length);
        ul.appendChild(renderNoteItem(p.id, current[current.length - 1]));
        const badge = document.createElement("div");
        badge.className = "saved-badge";
        badge.textContent = "Saved";
        formEl.appendChild(badge);
        if (current.length >= NOTES_MAX) {
          formEl.hidden = true;
          limitWarning.textContent = "Max notes reached.";
          if (!limitWarning.isConnected)
            notesWrapper.insertBefore(limitWarning, errorBanner);
        }
      });
      card.appendChild(title);
      card.appendChild(preview);
      card.appendChild(ratingEl);
      card.appendChild(actions);
      card.appendChild(notesWrapper);
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

  function renderNoteItem(promptId, note) {
    const li = document.createElement("li");
    li.className = "note-item";
    li.setAttribute("data-note-id", note.id);
    const contentEl = document.createElement("div");
    contentEl.className = "note-content";
    contentEl.textContent = note.content;
    const actions = document.createElement("div");
    actions.className = "note-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn";
    editBtn.textContent = "Edit";
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn danger";
    delBtn.textContent = "Delete";
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    editBtn.addEventListener("click", () => beginEditNote(promptId, note, li));
    delBtn.addEventListener("click", () => deleteNote(promptId, note.id, li));
    li.appendChild(contentEl);
    li.appendChild(actions);
    return li;
  }

  function beginEditNote(promptId, note, container) {
    if (container.querySelector(".note-edit-area")) return; // already editing
    container.innerHTML = "";
    const editArea = document.createElement("div");
    editArea.className = "note-edit-area";
    const ta = document.createElement("textarea");
    ta.value = note.content;
    ta.maxLength = NOTES_CHAR_MAX;
    const meta = document.createElement("div");
    meta.className = "note-meta";
    const count = document.createElement("span");
    count.textContent = `${ta.value.length} / ${NOTES_CHAR_MAX}`;
    const save = document.createElement("button");
    save.type = "button";
    save.className = "btn primary";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = "Cancel";
    meta.appendChild(count);
    meta.appendChild(save);
    meta.appendChild(cancel);
    editArea.appendChild(ta);
    editArea.appendChild(meta);
    container.appendChild(editArea);
    ta.focus();
    ta.addEventListener("input", () => {
      count.textContent = `${ta.value.length} / ${NOTES_CHAR_MAX}`;
      save.disabled = ta.value.trim().length === 0;
    });
    cancel.addEventListener("click", () => {
      // Re-render single note without full re-render
      const notes = loadNotes(promptId);
      const fresh = notes.find((n) => n.id === note.id);
      if (fresh) {
        const replacement = renderNoteItem(promptId, fresh);
        container.replaceWith(replacement);
      }
    });
    save.addEventListener("click", () => {
      const newContent = ta.value.trim();
      if (!newContent) return;
      const notes = loadNotes(promptId);
      const target = notes.find((n) => n.id === note.id);
      if (!target) return;
      if (target.content.trim() === newContent) {
        cancel.click();
        return;
      }
      target.content = newContent;
      target.updatedAt = Date.now();
      if (!persistNotes(promptId, notes)) {
        // show error by forcing full render so banner appears
        render();
        return;
      }
      const replacement = renderNoteItem(promptId, target);
      container.replaceWith(replacement);
      const badge = document.createElement("div");
      badge.className = "saved-badge";
      badge.textContent = "Saved";
      replacement.appendChild(badge);
    });
  }

  function deleteNote(promptId, noteId, container) {
    const notes = loadNotes(promptId);
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return;
    notes.splice(idx, 1);
    if (!persistNotes(promptId, notes)) {
      render();
      return;
    }
    container.remove();
    // update count badge
    const wrapper = document.querySelector(
      `[data-notes-wrapper='${promptId}']`
    );
    if (wrapper) {
      const countEl = wrapper.querySelector(".notes-header .count-badge");
      if (countEl) countEl.textContent = String(notes.length);
      const formEl = wrapper.querySelector("[data-note-form]");
      if (formEl && notes.length < NOTES_MAX) formEl.hidden = false;
      const limitWarning = wrapper.querySelector(".notes-limit-warning");
      if (limitWarning)
        limitWarning.textContent =
          notes.length >= NOTES_MAX ? "Max notes reached." : "";
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
