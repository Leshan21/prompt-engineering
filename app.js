(function () {
  const STORAGE_KEY = "promptLibrary.prompts";
  const form = document.getElementById("promptForm");
  const modelInput = document.getElementById("promptModelName");
  const titleInput = document.getElementById("promptTitle");
  const contentInput = document.getElementById("promptContent");
  const isCodeCheckbox = document.getElementById("isCodeFlag");
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
        return parsed.map((p) => {
          const upgraded = {
            ...p,
            rating: typeof p.rating === "number" ? p.rating : 0,
          };
          // Attach metadata if missing (legacy prompts)
          if (!upgraded.metadata) {
            try {
              upgraded.metadata = trackModel(
                "unknown-model",
                upgraded.content || ""
              );
            } catch (e) {
              // Fallback minimal metadata to avoid render break
              const nowIso = new Date().toISOString();
              upgraded.metadata = {
                model: "unknown-model",
                createdAt: nowIso,
                updatedAt: nowIso,
                tokenEstimate: { min: 0, max: 0, confidence: "high" },
              };
            }
          }
          return upgraded;
        });
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
    // Sort by metadata.createdAt desc (fallback to numeric createdAt)
    const sorted = filtered.slice().sort((a, b) => {
      const aDate =
        a.metadata && a.metadata.createdAt
          ? new Date(a.metadata.createdAt)
          : new Date(a.createdAt || 0);
      const bDate =
        b.metadata && b.metadata.createdAt
          ? new Date(b.metadata.createdAt)
          : new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    const fragment = document.createDocumentFragment();
    sorted.forEach((p) => {
      const card = document.createElement("article");
      card.className = "card fade-in";
      card.setAttribute("data-id", p.id);
      const title = document.createElement("h3");
      title.textContent = p.title;
      const preview = document.createElement("p");
      preview.className = "preview";
      preview.textContent = truncateWords(p.content, 15);
      // Metadata block
      const metadata = p.metadata;
      const metaBlock = document.createElement("div");
      metaBlock.className = "metadata-block";
      const row1 = document.createElement("div");
      row1.className = "metadata-row";
      const modelSpan = document.createElement("span");
      modelSpan.textContent = `Model: ${metadata.model}`;
      const createdSpan = document.createElement("span");
      createdSpan.textContent = `Created: ${new Date(
        metadata.createdAt
      ).toLocaleString()}`;
      const updatedSpan = document.createElement("span");
      updatedSpan.textContent = `Updated: ${new Date(
        metadata.updatedAt
      ).toLocaleString()}`;
      row1.appendChild(modelSpan);
      row1.appendChild(createdSpan);
      row1.appendChild(updatedSpan);
      const row2 = document.createElement("div");
      row2.className = "metadata-row";
      const tokensSpan = document.createElement("span");
      tokensSpan.textContent = `Tokens (est): ${metadata.tokenEstimate.min} - ${metadata.tokenEstimate.max}`;
      const confSpan = document.createElement("span");
      confSpan.textContent = `Confidence: ${metadata.tokenEstimate.confidence}`;
      confSpan.className = `confidence-${metadata.tokenEstimate.confidence}`;
      row2.appendChild(tokensSpan);
      row2.appendChild(confSpan);
      const refreshBtn = document.createElement("button");
      refreshBtn.type = "button";
      refreshBtn.className = "btn refresh-meta-btn";
      refreshBtn.textContent = "Refresh Metadata";
      refreshBtn.addEventListener("click", () => refreshMetadata(p.id));
      metaBlock.appendChild(row1);
      metaBlock.appendChild(row2);
      metaBlock.appendChild(refreshBtn);
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
      card.appendChild(metaBlock);
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

  function createPrompt(title, content, modelName, isCodeOverride) {
    let metadata;
    try {
      metadata = trackModel(modelName, content);
      if (isCodeOverride) {
        metadata.tokenEstimate = estimateTokens(content, true);
      }
    } catch (e) {
      alert("Metadata error: " + e.message);
      const nowIso = new Date().toISOString();
      metadata = {
        model: modelName || "invalid",
        createdAt: nowIso,
        updatedAt: nowIso,
        tokenEstimate: { min: 0, max: 0, confidence: "low" },
      };
    }
    return {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: title.trim(),
      content: content.trim(),
      createdAt: Date.now(),
      rating: 0,
      metadata,
    };
  }

  // Refresh metadata timestamps only
  function refreshMetadata(id) {
    const prompts = loadPrompts();
    const target = prompts.find((p) => p.id === id);
    if (!target || !target.metadata) return;
    try {
      target.metadata = updateTimestamps(target.metadata);
      savePrompts(prompts);
      render();
    } catch (e) {
      alert("Update failed: " + e.message);
    }
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
    const modelName = modelInput.value.trim();
    const isCodeFlag = !!isCodeCheckbox.checked;
    if (!title || !content) {
      return; // native required handles, but double-check
    }
    if (!modelName) {
      alert("Model name is required.");
      return;
    }
    const prompts = loadPrompts();
    prompts.unshift(createPrompt(title, content, modelName, isCodeFlag)); // newest first with metadata
    savePrompts(prompts);
    form.reset();
    titleInput.focus();
    render();
  });

  // ---------------- Metadata System ----------------
  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  function validateISODate(str) {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (!isoRegex.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime()) && d.toISOString() === str;
  }

  function validateModelName(name) {
    assert(typeof name === "string", "Model name must be a string.");
    const trimmed = name.trim();
    assert(trimmed.length > 0, "Model name cannot be empty.");
    assert(trimmed.length <= 100, "Model name exceeds 100 characters.");
    return trimmed;
  }

  function isLikelyCode(text) {
    if (!text) return false;
    const codeIndicators = [
      "function ",
      "class ",
      "=>",
      "#include",
      "import ",
      "def ",
      "const ",
      "let ",
      "var ",
      "```",
    ];
    return codeIndicators.some((k) => text.includes(k));
  }

  function estimateTokens(text, isCode) {
    assert(typeof text === "string", "Text must be a string.");
    const words =
      text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;
    let min = 0.75 * words;
    let max = 0.25 * chars;
    if (isCode) {
      min *= 1.3;
      max *= 1.3;
    }
    min = Math.round(min);
    max = Math.round(max);
    const reference = max; // use max for confidence thresholding
    let confidence = "high";
    if (reference >= 1000 && reference <= 5000) confidence = "medium";
    else if (reference > 5000) confidence = "low";
    return { min, max, confidence };
  }

  function trackModel(modelName, content) {
    const model = validateModelName(modelName);
    assert(
      typeof content === "string" && content.trim().length > 0,
      "Content must be a non-empty string."
    );
    const createdAt = new Date().toISOString();
    const tokenEstimate = estimateTokens(content, isLikelyCode(content));
    return {
      model,
      createdAt,
      updatedAt: createdAt,
      tokenEstimate,
    };
  }

  function updateTimestamps(metadata) {
    assert(
      metadata && typeof metadata === "object",
      "Metadata object required."
    );
    assert(validateISODate(metadata.createdAt), "Invalid createdAt format.");
    const newUpdated = new Date().toISOString();
    assert(
      new Date(newUpdated) >= new Date(metadata.createdAt),
      "updatedAt cannot be earlier than createdAt."
    );
    return { ...metadata, updatedAt: newUpdated };
  }

  // Expose for potential debugging (optional)
  window.__promptMetadataAPI = { trackModel, updateTimestamps, estimateTokens };

  // Initial render
  render();
})();
