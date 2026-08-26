const STORAGE_PREFIX = "prus-sentence-validation-certainty-scale-experience-boundary-v3";
const SAMPLE_VERSION = "2026-08-26-sentence-certainty-scale-experience-boundary-v3";
const DATA_PATH = "data/sample_sentences.json?v=20260826-experience-boundary-v3";
const CONFIG = window.PRUS_VALIDATION_CONFIG || { backendUrl: "" };
const ALLOWED_DOMAINS = ["content", "performance", "requirements_access"];

const screens = {
  home: document.querySelector("#home-screen"),
  instructions: document.querySelector("#instructions-screen"),
  exercise: document.querySelector("#exercise-screen"),
  finished: document.querySelector("#finished-screen")
};

const els = {
  status: document.querySelector("#status-pill"),
  brand: document.querySelector(".brand"),
  newTab: document.querySelector("#new-tab"),
  resumeTab: document.querySelector("#resume-tab"),
  newForm: document.querySelector("#new-form"),
  resumeForm: document.querySelector("#resume-form"),
  resumeError: document.querySelector("#resume-error"),
  backHome: document.querySelector("#back-home"),
  startExercise: document.querySelector("#start-exercise"),
  positionLabel: document.querySelector("#position-label"),
  totalLabel: document.querySelector("#total-label"),
  progressBar: document.querySelector("#progress-bar"),
  gameLabel: document.querySelector("#game-label"),
  releaseTimingLabel: document.querySelector("#release-timing-label"),
  sentenceText: document.querySelector("#sentence-text"),
  cueDecision: document.querySelector("#cue-decision"),
  certaintyForm: document.querySelector("#certainty-form"),
  certaintyOptions: document.querySelectorAll('input[name="certainty_rating"]'),
  confirmCertainty: document.querySelector("#confirm-certainty"),
  gameRelationDecision: document.querySelector("#game-relation-decision"),
  propositionDecision: document.querySelector("#proposition-decision"),
  domainDecision: document.querySelector("#domain-decision"),
  noQualifyingDomain: document.querySelector("#no-qualifying-domain"),
  confirmDomains: document.querySelector("#confirm-domains"),
  backToGameRelation: document.querySelector("#back-to-game-relation"),
  backToProposition: document.querySelector("#back-to-proposition"),
  restartComponentCoding: document.querySelectorAll(".restart-component-coding"),
  previous: document.querySelector("#previous"),
  saveExit: document.querySelector("#save-exit"),
  exerciseSaveMessage: document.querySelector("#exercise-save-message"),
  returnHome: document.querySelector("#return-home"),
  remoteSaveMessage: document.querySelector("#remote-save-message"),
  retryRemoteSave: document.querySelector("#retry-remote-save"),
  downloadCsv: document.querySelector("#download-csv"),
  downloadJson: document.querySelector("#download-json")
};

let dataset = null;
let participant = null;
let session = null;
let currentIndex = 0;
let finishing = false;
let lastCheckpointCount = -1;
let remoteSaveInFlight = false;
let pendingRemoteSave = null;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function participantKey(email) {
  return `${STORAGE_PREFIX}:participant:${normalizeEmail(email)}`;
}

function sessionKey(email) {
  return `${STORAGE_PREFIX}:session:${normalizeEmail(email)}`;
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    node.hidden = key !== name;
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setStatus(text) {
  els.status.textContent = text;
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadData() {
  const response = await fetch(DATA_PATH);
  if (!response.ok) {
    throw new Error(`Could not load validation sample: ${response.status}`);
  }
  dataset = await response.json();
  if (!Array.isArray(dataset.sentences) || dataset.sentences.length !== 500) {
    throw new Error("The sentence-level validation sample is incomplete.");
  }
  els.totalLabel.textContent = dataset.sentences.length;
}

function emptyResponses() {
  return dataset.sentences.map((sentence) => ({
    sentence_id: sentence.id,
    cue_response_kind: null,
    uncertainty_cue_present: null,
    game_related_uncertainty_present: null,
    proposition_or_experience_concern_present: null,
    human_domains: [],
    no_qualifying_domain: null,
    derived_PRUS: null,
    answered_at: null
  }));
}

function createSession(person) {
  const now = new Date().toISOString();
  return {
    version: 1,
    validation_unit: "sentence",
    participant_email: person.email,
    started_at: now,
    updated_at: now,
    completed_at: null,
    current_index: 0,
    responses: emptyResponses()
  };
}

function responseComplete(response) {
  if (response.uncertainty_cue_present === false) return true;
  if (response.uncertainty_cue_present !== true) return false;
  if (response.game_related_uncertainty_present === false) return true;
  if (response.game_related_uncertainty_present !== true) return false;
  if (response.proposition_or_experience_concern_present === false) return true;
  if (response.proposition_or_experience_concern_present !== true) return false;
  const hasDomain = Array.isArray(response.human_domains) && response.human_domains.length > 0;
  const hasNoDomain = response.no_qualifying_domain === true;
  return hasDomain !== hasNoDomain;
}

function derivePrus(response) {
  if (!responseComplete(response)) return null;
  return response.uncertainty_cue_present === true
    && response.game_related_uncertainty_present === true
    && response.proposition_or_experience_concern_present === true
    && response.no_qualifying_domain !== true
    && response.human_domains.length > 0;
}

function persistLocalSession() {
  if (!participant || !session) return;
  session.updated_at = new Date().toISOString();
  session.current_index = currentIndex;
  saveJson(sessionKey(participant.email), session);
}

async function postRemoteProgress(saveReason) {
  if (!CONFIG.backendUrl) {
    throw new Error("The secure response endpoint is not configured.");
  }
  let lastError = new Error("Secure save failed.");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response = null;
    try {
      session.validation_unit = "sentence";
      const sampleMetadata = {
        ...dataset.metadata,
        sample_version: SAMPLE_VERSION,
        unit_of_validation: "sentence",
        annotation_scheme: "sentence_certainty_scale_game_relation_proposition_experience_v3"
      };
      response = await fetch(CONFIG.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant,
          session,
          sample_metadata: sampleMetadata,
          save_reason: saveReason
        })
      });
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
    if (response) {
      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      if (response.ok && result?.saved) return result;
      lastError = new Error(result?.error || `Secure save failed (${response.status}).`);
      if (![429, 502, 503, 504].includes(response.status)) throw lastError;
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
    }
  }
  throw lastError;
}

function savePriority(reason) {
  if (reason === "completed") return 3;
  if (reason === "save_exit") return 2;
  return 1;
}

function queueRemoteProgress(saveReason) {
  return new Promise((resolve, reject) => {
    if (!pendingRemoteSave) {
      pendingRemoteSave = { reason: saveReason, waiters: [] };
    } else if (savePriority(saveReason) > savePriority(pendingRemoteSave.reason)) {
      pendingRemoteSave.reason = saveReason;
    }
    pendingRemoteSave.waiters.push({ resolve, reject });
    drainRemoteSaves();
  });
}

async function drainRemoteSaves() {
  if (remoteSaveInFlight || !pendingRemoteSave) return;
  const job = pendingRemoteSave;
  pendingRemoteSave = null;
  remoteSaveInFlight = true;
  try {
    const result = await postRemoteProgress(job.reason);
    job.waiters.forEach(({ resolve }) => resolve(result));
  } catch (error) {
    job.waiters.forEach(({ reject }) => reject(error));
  } finally {
    remoteSaveInFlight = false;
    if (pendingRemoteSave) drainRemoteSaves();
  }
}

function answeredCount() {
  return session.responses.filter(responseComplete).length;
}

function firstUnansweredIndex() {
  const index = session.responses.findIndex((response) => !responseComplete(response));
  return index === -1 ? dataset.sentences.length : index;
}

function checkpointIfDue() {
  const completed = answeredCount();
  const interval = Math.max(1, Number(CONFIG.checkpointEvery) || 25);
  if (!CONFIG.backendUrl || completed === 0 || completed % interval !== 0 || completed === lastCheckpointCount) {
    return;
  }
  lastCheckpointCount = completed;
  queueRemoteProgress("checkpoint")
    .then((result) => setStatus(`${result.answered} / ${dataset.sentences.length} coded · saved`))
    .catch(() => {
      lastCheckpointCount = -1;
      setStatus(`${completed} / ${dataset.sentences.length} coded · save pending`);
    });
}

function startParticipant(person, existingSession = null) {
  participant = person;
  session = existingSession || createSession(person);
  currentIndex = Math.min(firstUnansweredIndex(), dataset.sentences.length - 1);
  persistLocalSession();
  setStatus(`${answeredCount()} / ${dataset.sentences.length} coded`);
  showScreen("instructions");
}

function responseStage(response) {
  if (response.uncertainty_cue_present !== true) return "cue";
  if (response.game_related_uncertainty_present !== true) return "game_relation";
  if (response.proposition_or_experience_concern_present !== true) return "proposition";
  return "domain";
}

function syncDomainButtons(response) {
  const selected = new Set(Array.isArray(response.human_domains) ? response.human_domains : []);
  els.domainDecision.querySelectorAll("button[data-domain]").forEach((button) => {
    const active = selected.has(button.dataset.domain);
    button.setAttribute("aria-pressed", String(active));
  });
  const noDomain = response.no_qualifying_domain === true;
  els.noQualifyingDomain.setAttribute("aria-pressed", String(noDomain));
  els.confirmDomains.disabled = selected.size === 0 && !noDomain;
}

function showResponseStage(response) {
  const stage = responseStage(response);
  els.cueDecision.hidden = stage !== "cue";
  els.gameRelationDecision.hidden = stage !== "game_relation";
  els.propositionDecision.hidden = stage !== "proposition";
  els.domainDecision.hidden = stage !== "domain";
  if (stage === "cue") {
    els.certaintyOptions.forEach((option) => {
      option.checked = false;
    });
    els.confirmCertainty.disabled = true;
  }
}

function showCurrentSentence() {
  if (firstUnansweredIndex() >= dataset.sentences.length) {
    finishSession();
    return;
  }

  const item = dataset.sentences[currentIndex];
  const response = session.responses[currentIndex];
  const completed = answeredCount();
  const progress = Math.round((completed / dataset.sentences.length) * 100);
  const days = Math.abs(Number(item.release_relative_day));

  els.positionLabel.textContent = String(currentIndex + 1);
  els.progressBar.style.width = `${progress}%`;
  els.gameLabel.textContent = item.app_name || "Unknown game";
  els.releaseTimingLabel.textContent = `Published ${days} day${days === 1 ? "" : "s"} before release`;
  els.sentenceText.textContent = item.sentence;
  showResponseStage(response);
  syncDomainButtons(response);
  els.previous.disabled = currentIndex === 0;
  els.exerciseSaveMessage.textContent = "";
  setStatus(`${completed} / ${dataset.sentences.length} coded`);
  showScreen("exercise");
}

function answerCue(kind) {
  if (!["yes", "information_request", "no"].includes(kind)) return;
  const qualifyingCue = kind === "yes";
  session.responses[currentIndex] = {
    ...session.responses[currentIndex],
    cue_response_kind: kind,
    uncertainty_cue_present: qualifyingCue,
    game_related_uncertainty_present: null,
    proposition_or_experience_concern_present: null,
    human_domains: [],
    no_qualifying_domain: null,
    derived_PRUS: qualifyingCue ? null : false,
    answered_at: qualifyingCue ? null : new Date().toISOString()
  };
  if (qualifyingCue) {
    persistLocalSession();
    showCurrentSentence();
  } else {
    advance();
  }
}

function answerGameRelation(present) {
  session.responses[currentIndex] = {
    ...session.responses[currentIndex],
    cue_response_kind: "yes",
    uncertainty_cue_present: true,
    game_related_uncertainty_present: present,
    proposition_or_experience_concern_present: null,
    human_domains: [],
    no_qualifying_domain: null,
    derived_PRUS: present ? null : false,
    answered_at: present ? null : new Date().toISOString()
  };
  if (present) {
    persistLocalSession();
    showCurrentSentence();
  } else {
    advance();
  }
}

function answerProposition(present) {
  session.responses[currentIndex] = {
    ...session.responses[currentIndex],
    cue_response_kind: "yes",
    uncertainty_cue_present: true,
    game_related_uncertainty_present: true,
    proposition_or_experience_concern_present: present,
    human_domains: [],
    no_qualifying_domain: null,
    derived_PRUS: present ? null : false,
    answered_at: present ? null : new Date().toISOString()
  };
  if (present) {
    persistLocalSession();
    showCurrentSentence();
  } else {
    advance();
  }
}

function toggleDomain(domain) {
  if (!ALLOWED_DOMAINS.includes(domain)) return;
  const response = session.responses[currentIndex];
  const selected = new Set(Array.isArray(response.human_domains) ? response.human_domains : []);
  if (selected.has(domain)) selected.delete(domain);
  else selected.add(domain);
  response.cue_response_kind = "yes";
  response.uncertainty_cue_present = true;
  response.game_related_uncertainty_present = true;
  response.proposition_or_experience_concern_present = true;
  response.human_domains = ALLOWED_DOMAINS.filter((value) => selected.has(value));
  response.no_qualifying_domain = false;
  response.derived_PRUS = null;
  response.answered_at = null;
  persistLocalSession();
  syncDomainButtons(response);
}

function toggleNoQualifyingDomain() {
  const response = session.responses[currentIndex];
  const active = response.no_qualifying_domain === true;
  response.cue_response_kind = "yes";
  response.uncertainty_cue_present = true;
  response.game_related_uncertainty_present = true;
  response.proposition_or_experience_concern_present = true;
  response.human_domains = [];
  response.no_qualifying_domain = !active;
  response.derived_PRUS = null;
  response.answered_at = null;
  persistLocalSession();
  syncDomainButtons(response);
}

function confirmDomains() {
  const response = session.responses[currentIndex];
  const hasDomain = Array.isArray(response.human_domains) && response.human_domains.length > 0;
  const hasNoDomain = response.no_qualifying_domain === true;
  if (hasDomain === hasNoDomain) return;
  response.cue_response_kind = "yes";
  response.uncertainty_cue_present = true;
  response.game_related_uncertainty_present = true;
  response.proposition_or_experience_concern_present = true;
  response.derived_PRUS = hasDomain;
  response.answered_at = new Date().toISOString();
  advance();
}

function resetCurrentResponse() {
  session.responses[currentIndex] = {
    ...session.responses[currentIndex],
    cue_response_kind: null,
    uncertainty_cue_present: null,
    game_related_uncertainty_present: null,
    proposition_or_experience_concern_present: null,
    human_domains: [],
    no_qualifying_domain: null,
    derived_PRUS: null,
    answered_at: null
  };
}

function restartComponentCoding() {
  resetCurrentResponse();
  persistLocalSession();
  showCurrentSentence();
}

function backToGameRelation() {
  session.responses[currentIndex] = {
    ...session.responses[currentIndex],
    cue_response_kind: "yes",
    uncertainty_cue_present: true,
    game_related_uncertainty_present: null,
    proposition_or_experience_concern_present: null,
    human_domains: [],
    no_qualifying_domain: null,
    derived_PRUS: null,
    answered_at: null
  };
  persistLocalSession();
  showCurrentSentence();
}

function backToProposition() {
  session.responses[currentIndex] = {
    ...session.responses[currentIndex],
    cue_response_kind: "yes",
    uncertainty_cue_present: true,
    game_related_uncertainty_present: true,
    proposition_or_experience_concern_present: null,
    human_domains: [],
    no_qualifying_domain: null,
    derived_PRUS: null,
    answered_at: null
  };
  persistLocalSession();
  showCurrentSentence();
}

function advance() {
  persistLocalSession();
  checkpointIfDue();
  if (firstUnansweredIndex() >= dataset.sentences.length) {
    finishSession();
    return;
  }
  currentIndex = firstUnansweredIndex();
  showCurrentSentence();
}

function goPrevious() {
  if (currentIndex <= 0) return;
  currentIndex -= 1;
  resetCurrentResponse();
  persistLocalSession();
  showCurrentSentence();
}

async function saveCompletedSession() {
  els.retryRemoteSave.hidden = true;
  els.remoteSaveMessage.className = "save-message";
  els.remoteSaveMessage.textContent = "Saving your completed responses securely…";
  setStatus("Saving completed session…");
  try {
    const result = await queueRemoteProgress("completed");
    els.remoteSaveMessage.className = "save-message success";
    els.remoteSaveMessage.textContent = "Saved successfully to the secure research repository.";
    setStatus(`${dataset.sentences.length} / ${dataset.sentences.length} coded · securely saved`);
    return result;
  } catch (error) {
    els.remoteSaveMessage.className = "save-message error";
    els.remoteSaveMessage.textContent = `${error.message} Your responses remain saved in this browser; please retry.`;
    els.retryRemoteSave.hidden = false;
    setStatus("Completed · secure save needs retry");
    throw error;
  }
}

async function finishSession() {
  if (finishing) return;
  finishing = true;
  session.completed_at = session.completed_at || new Date().toISOString();
  currentIndex = dataset.sentences.length - 1;
  persistLocalSession();
  showScreen("finished");
  try {
    await saveCompletedSession();
  } catch {
    // Retry and backup options remain visible on the completion screen.
  } finally {
    finishing = false;
  }
}

function mergedRows() {
  return dataset.sentences.map((item, index) => {
    const response = session.responses[index];
    return {
      participant_name: participant.name,
      participant_email: participant.email,
      participant_phone: participant.phone || "",
      validation_order: item.validation_order,
      sentence_id: item.id,
      app_id: item.app_id,
      app_name: item.app_name,
      release_date: item.release_date,
      release_relative_day: item.release_relative_day,
      sentence: item.sentence,
      cue_response_kind: response.cue_response_kind,
      uncertainty_cue_present: response.uncertainty_cue_present,
      game_related_uncertainty_present: response.game_related_uncertainty_present,
      proposition_or_experience_concern_present: response.proposition_or_experience_concern_present,
      human_domains: (response.human_domains || []).join("|"),
      no_qualifying_domain: response.no_qualifying_domain,
      derived_PRUS: derivePrus(response),
      answered_at: response.answered_at
    };
  });
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv() {
  const rows = mergedRows();
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
  download(`sentence_certainty_game_relation_validation_${normalizeEmail(participant.email)}.csv`, csv, "text/csv;charset=utf-8");
}

function downloadJson() {
  const payload = {
    participant,
    session,
    sample_metadata: dataset.metadata,
    rows: mergedRows()
  };
  download(
    `sentence_certainty_game_relation_validation_${normalizeEmail(participant.email)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
}

function showHome() {
  participant = null;
  session = null;
  currentIndex = 0;
  els.newForm.reset();
  els.resumeForm.reset();
  els.resumeError.textContent = "";
  setStatus("Not started");
  showScreen("home");
}

function setEntryMode(mode) {
  const isNew = mode === "new";
  els.newTab.classList.toggle("active", isNew);
  els.newTab.setAttribute("aria-selected", String(isNew));
  els.resumeTab.classList.toggle("active", !isNew);
  els.resumeTab.setAttribute("aria-selected", String(!isNew));
  els.newForm.hidden = !isNew;
  els.resumeForm.hidden = isNew;
  els.resumeError.textContent = "";
}

els.newTab.addEventListener("click", () => setEntryMode("new"));
els.resumeTab.addEventListener("click", () => setEntryMode("resume"));
els.brand.addEventListener("click", (event) => {
  event.preventDefault();
  showHome();
});
els.backHome.addEventListener("click", showHome);
els.returnHome.addEventListener("click", showHome);
els.startExercise.addEventListener("click", showCurrentSentence);

els.newForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(els.newForm);
  const person = {
    name: String(form.get("name") || "").trim(),
    email: normalizeEmail(form.get("email")),
    phone: String(form.get("phone") || "").trim()
  };
  if (!person.name || !person.email || !person.phone) return;
  saveJson(participantKey(person.email), person);
  startParticipant(person);
});

els.resumeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(els.resumeForm);
  const email = normalizeEmail(form.get("email"));
  const savedParticipant = readJson(participantKey(email));
  const savedSession = readJson(sessionKey(email));
  if (!savedParticipant || !savedSession || savedSession.validation_unit !== "sentence") {
    els.resumeError.textContent = "No sentence-coding record was found for that email address.";
    return;
  }
  startParticipant(savedParticipant, savedSession);
});

els.certaintyOptions.forEach((option) => {
  option.addEventListener("change", () => {
    els.confirmCertainty.disabled = false;
  });
});

els.certaintyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = els.certaintyForm.querySelector('input[name="certainty_rating"]:checked');
  if (!selected) return;
  if (selected.value === "information_request") {
    answerCue("information_request");
    return;
  }
  const rating = Number(selected.value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
  answerCue(rating === 5 ? "no" : "yes");
});

document.querySelectorAll("[data-proposition-answer]").forEach((button) => {
  button.addEventListener("click", () => answerProposition(button.dataset.propositionAnswer === "yes"));
});

document.querySelectorAll("[data-game-relation-answer]").forEach((button) => {
  button.addEventListener("click", () => answerGameRelation(button.dataset.gameRelationAnswer === "yes"));
});

document.querySelectorAll("[data-domain]").forEach((button) => {
  button.addEventListener("click", () => toggleDomain(button.dataset.domain));
});

els.noQualifyingDomain.addEventListener("click", toggleNoQualifyingDomain);
els.confirmDomains.addEventListener("click", confirmDomains);
els.backToGameRelation.addEventListener("click", backToGameRelation);
els.backToProposition.addEventListener("click", backToProposition);
els.restartComponentCoding.forEach((button) => button.addEventListener("click", restartComponentCoding));
els.previous.addEventListener("click", goPrevious);

els.saveExit.addEventListener("click", async () => {
  persistLocalSession();
  els.exerciseSaveMessage.textContent = "Saving…";
  try {
    const result = await queueRemoteProgress("save_exit");
    els.exerciseSaveMessage.textContent = `${result.answered} responses saved securely.`;
    setStatus(`${result.answered} / ${dataset.sentences.length} coded · saved`);
    window.setTimeout(showHome, 700);
  } catch (error) {
    els.exerciseSaveMessage.className = "form-message error";
    els.exerciseSaveMessage.textContent = `${error.message} Your browser copy is still available.`;
  }
});

els.retryRemoteSave.addEventListener("click", () => {
  saveCompletedSession().catch(() => {});
});
els.downloadCsv.addEventListener("click", downloadCsv);
els.downloadJson.addEventListener("click", downloadJson);

loadData()
  .then(() => {
    if (CONFIG.validationPaused) {
      setStatus("Temporarily paused");
      document.querySelectorAll("button, input").forEach((element) => {
        element.disabled = true;
      });
    }
  })
  .catch((error) => {
    setStatus("Sample unavailable");
    els.resumeError.textContent = error.message;
  });
