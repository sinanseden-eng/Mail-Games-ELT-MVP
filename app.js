(() => {
  "use strict";

  const STORAGE = {
    questions: "mailgames.questions.v1",
    penalty: "mailgames.penalty.v1",
    turkey: "mailgames.turkey.v1",
    sniper: "mailgames.sniper.v1"
  };

  const sampleQuestions = [
    {
      id: crypto.randomUUID(),
      prompt: "She ___ here since 2023.",
      type: "multiple-choice",
      options: ["works", "worked", "has worked", "is working"],
      answer: "has worked",
      explanation: "Use the present perfect with ‘since’ for an action continuing until now.",
      level: "B1",
      tag: "Present Perfect"
    },
    {
      id: crypto.randomUUID(),
      prompt: "Choose the best synonym for ‘enormous’.",
      type: "multiple-choice",
      options: ["tiny", "huge", "quiet", "ordinary"],
      answer: "huge",
      explanation: "‘Enormous’ and ‘huge’ both mean very large.",
      level: "A2",
      tag: "Vocabulary"
    },
    {
      id: crypto.randomUUID(),
      prompt: "If I ___ more time, I would learn Italian.",
      type: "multiple-choice",
      options: ["have", "had", "will have", "am having"],
      answer: "had",
      explanation: "The second conditional uses if + past simple, then would + base verb.",
      level: "B1",
      tag: "Conditionals"
    },
    {
      id: crypto.randomUUID(),
      prompt: "‘The homework was completed by Maya’ is a passive sentence.",
      type: "true-false",
      options: ["True", "False"],
      answer: "True",
      explanation: "The object receives the action: was completed.",
      level: "B1",
      tag: "Passive Voice"
    },
    {
      id: crypto.randomUUID(),
      prompt: "Complete the sentence: We arrived ___ the airport at six.",
      type: "multiple-choice",
      options: ["in", "at", "on", "to"],
      answer: "at",
      explanation: "We use ‘arrive at’ for a specific place such as an airport or station.",
      level: "A2",
      tag: "Prepositions"
    },
    {
      id: crypto.randomUUID(),
      prompt: "Choose the correctly punctuated sentence.",
      type: "multiple-choice",
      options: [
        "However I stayed at home.",
        "However, I stayed at home.",
        "However; I stayed at home.",
        "However I, stayed at home."
      ],
      answer: "However, I stayed at home.",
      explanation: "A comma normally follows an introductory linking adverb such as ‘however’.",
      level: "B2",
      tag: "Punctuation"
    }
  ];

  const penaltyZones = [
    ["top-left", "Top left"],
    ["top-centre", "Top centre"],
    ["top-right", "Top right"],
    ["bottom-left", "Bottom left"],
    ["bottom-centre", "Bottom centre"],
    ["bottom-right", "Bottom right"]
  ];

  const turkeyMoves = [
    { id: "wing-slap", label: "Wing Slap", type: "attack", damage: 18, note: "Strong high attack" },
    { id: "peck", label: "Peck", type: "attack", damage: 14, note: "Quick close attack" },
    { id: "charge", label: "Charge", type: "attack", damage: 22, note: "Powerful but predictable" },
    { id: "block", label: "Block", type: "defence", damage: 0, note: "Stops Peck and Wing Slap" },
    { id: "duck", label: "Duck", type: "defence", damage: 0, note: "Avoids Wing Slap and Charge" },
    { id: "counter", label: "Counter", type: "defence", damage: 0, note: "Punishes Peck and Charge" }
  ];

  let activePlayGame = "penalty";
  let currentQuestionId = null;
  let answerState = null;

  const app = document.getElementById("app");

  function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase("en")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  }

  function getQuestions() {
    const raw = localStorage.getItem(STORAGE.questions);
    if (raw === null) {
      const initial = sampleQuestions.map(question => ({ ...question }));
      saveQuestions(initial);
      return initial;
    }
    try {
      const stored = JSON.parse(raw);
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  function saveQuestions(questions) {
    localStorage.setItem(STORAGE.questions, JSON.stringify(questions));
  }

  function randomQuestion(excludeId = null) {
    const saved = getQuestions();
    const all = saved.length ? saved : sampleQuestions;
    const pool = all.filter(q => q.id !== excludeId);
    return (pool.length ? pool : all)[Math.floor(Math.random() * (pool.length || all.length))];
  }

  function showToast(message) {
    document.querySelectorAll(".toast").forEach(el => el.remove());
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  function downloadText(filename, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function setRoute(route) {
    location.hash = route;
  }

  function routeFromHash() {
    return location.hash.replace(/^#/, "").split("?")[0] || "home";
  }

  function bindGlobalNavigation() {
    document.querySelectorAll("[data-route]").forEach(button => {
      button.addEventListener("click", () => setRoute(button.dataset.route));
    });
    document.querySelectorAll("[data-game]").forEach(button => {
      button.addEventListener("click", () => {
        activePlayGame = button.dataset.game;
        setRoute("play");
      });
    });
  }

  function updateNav(route) {
    document.querySelectorAll(".nav-link").forEach(button => {
      button.classList.toggle("active", button.dataset.route === route);
    });
  }

  function render() {
    const route = routeFromHash();
    document.body.dataset.route = route;
    updateNav(route);
    app.replaceChildren();
    currentQuestionId = null;
    answerState = null;

    if (route === "teacher") renderTeacher();
    else if (route === "play") renderPlay();
    else renderHome();

    bindGlobalNavigation();
    app.focus({ preventScroll: true });
  }

  function renderHome() {
    app.append(cloneTemplate("home-template"));
  }

  function renderTeacher() {
    app.append(cloneTemplate("teacher-template"));
    const form = document.getElementById("question-form");
    const typeSelect = form.elements.type;

    document.querySelectorAll("[data-studio-target]").forEach(button => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.studioTarget);
        if (!target) return;
        document.querySelectorAll(".rail-link[data-studio-target]").forEach(link => link.classList.remove("active"));
        button.classList.add("active");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    function syncTypeFields() {
      const type = typeSelect.value;
      const options = ["optionA", "optionB", "optionC", "optionD"];
      options.forEach((name, index) => {
        const input = form.elements[name];
        const label = input.closest("label");
        if (type === "gap-fill") label.style.display = "none";
        else {
          label.style.display = "grid";
          if (type === "true-false") {
            input.value = index === 0 ? "True" : index === 1 ? "False" : "";
            label.style.display = index < 2 ? "grid" : "none";
          }
        }
      });
    }

    typeSelect.addEventListener("change", syncTypeFields);
    syncTypeFields();

    form.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(form);
      const type = data.get("type");
      const options = [data.get("optionA"), data.get("optionB"), data.get("optionC"), data.get("optionD")]
        .map(value => String(value || "").trim())
        .filter(Boolean);
      const question = {
        id: crypto.randomUUID(),
        prompt: String(data.get("prompt")).trim(),
        type,
        options: type === "gap-fill" ? [] : options,
        answer: String(data.get("answer")).trim(),
        explanation: String(data.get("explanation") || "").trim(),
        level: String(data.get("level") || "B1"),
        tag: String(data.get("tag") || "General English").trim()
      };
      if (type !== "gap-fill" && question.options.length < 2) {
        showToast("Add at least two answer options.");
        return;
      }
      const questions = getQuestions();
      questions.push(question);
      saveQuestions(questions);
      form.reset();
      typeSelect.value = "multiple-choice";
      syncTypeFields();
      refreshQuestionList();
      showToast("Question added to both games.");
    });

    document.getElementById("load-sample").addEventListener("click", () => {
      saveQuestions(sampleQuestions.map(q => ({ ...q, id: crypto.randomUUID() })));
      refreshQuestionList();
      showToast("Sample question bank restored.");
    });

    document.getElementById("export-json").addEventListener("click", () => {
      downloadText("mailgames-question-bank.json", JSON.stringify(getQuestions(), null, 2), "application/json");
    });

    document.getElementById("download-template").addEventListener("click", () => {
      const csv = [
        "question,type,option_a,option_b,option_c,option_d,answer,explanation,level,tag",
        '"She ___ here since 2023.","multiple-choice","works","worked","has worked","is working","has worked","Use present perfect with since.","B1","Present Perfect"'
      ].join("\n");
      downloadText("mailgames-question-template.csv", csv, "text/csv");
    });

    document.getElementById("csv-file").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = parseQuestionCsv(text);
        if (!imported.length) throw new Error("No valid rows found");
        saveQuestions([...getQuestions(), ...imported]);
        refreshQuestionList();
        showToast(`${imported.length} question${imported.length === 1 ? "" : "s"} imported.`);
      } catch (error) {
        showToast(`CSV import failed: ${error.message}`);
      } finally {
        event.target.value = "";
      }
    });

    const launchForm = document.getElementById("match-launch-form");
    const launchButton = document.getElementById("launch-match-button");
    const missionStatus = document.getElementById("mission-status");
    const missionDetails = document.getElementById("mission-details");
    const launchResult = document.getElementById("launch-result");
    const launchReadyItem = document.getElementById("launch-ready-item");
    const testCodeInput = document.getElementById("mail-test-code");
    const deliveryMatchId = document.getElementById("delivery-match-id");
    const deliveryResult = document.getElementById("delivery-result");

    async function checkMissionControl() {
      missionStatus.textContent = "Checking…";
      missionStatus.className = "status-pill status-neutral";
      missionDetails.textContent = "Checking the database, turn-token service, site URL, and email provider…";
      try {
        const response = await fetch("/.netlify/functions/health", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Health check failed (${response.status})`);

        const configured = data.configured || {};
        const emailTestReady = Boolean(
          configured.siteUrl && configured.supabase && configured.turnTokens &&
          configured.email && configured.launchProtection && configured.recipientAllowlist
        );
        missionStatus.textContent = emailTestReady ? "Email test ready" : "Setup needed";
        missionStatus.className = `status-pill ${emailTestReady ? "status-ready" : "status-warning"}`;
        if (launchReadyItem) {
          launchReadyItem.classList.toggle("ready", emailTestReady);
          launchReadyItem.textContent = emailTestReady ? "Protected email test ready" : "Launch your email match";
        }

        const missing = [];
        if (!configured.siteUrl) missing.push("SITE_URL");
        if (!configured.supabase) missing.push("Supabase secret key");
        if (!configured.turnTokens) missing.push("TURN_TOKEN_SECRET");
        if (!configured.email) missing.push("Gmail API or Resend email variables");
        if (!configured.launchProtection) missing.push("MAILGAMES_TEST_CODE");
        if (!configured.recipientAllowlist) missing.push("MAIL_TEST_ALLOWED_RECIPIENTS");
        if (!emailTestReady) {
          missionDetails.textContent = `Missing: ${missing.join(", ")}. Add these values in Netlify, then redeploy.`;
        } else {
          const keyMode = data.details?.databaseKeyMode || "server key";
          const recipientCount = data.details?.allowedRecipientCount || 0;
          const emailProvider = data.details?.emailProvider || "email provider";
          missionDetails.textContent = `Protected Email Test Mode is ready. Email: ${emailProvider}; database key: ${keyMode}; approved inboxes: ${recipientCount}.`;
        }
        return configured;
      } catch (error) {
        missionStatus.textContent = "Unavailable";
        missionStatus.className = "status-pill status-error";
        if (launchReadyItem) {
          launchReadyItem.classList.remove("ready");
          launchReadyItem.textContent = "Mission Control unavailable";
        }
        missionDetails.textContent = location.protocol === "file:"
          ? "Run the project through Netlify or `netlify dev` to use server-backed matches."
          : `Mission Control could not be reached: ${error.message}`;
        return null;
      }
    }

    function setLaunchMessage(kind, title, message) {
      launchResult.hidden = false;
      launchResult.className = `launch-result ${kind}`;
      launchResult.replaceChildren();
      const heading = document.createElement("h3");
      heading.textContent = title;
      const paragraph = document.createElement("p");
      paragraph.textContent = message;
      launchResult.append(heading, paragraph);
    }

    function showCreatedMatch(data) {
      launchResult.hidden = false;
      launchResult.className = "launch-result success";
      launchResult.replaceChildren();

      const heading = document.createElement("h3");
      heading.textContent = "Match created";
      const summary = document.createElement("p");
      summary.textContent = data.email?.sent
        ? "Player A has been emailed the first turn."
        : `The match exists, but email delivery failed: ${data.email?.reason || "unknown provider error"}. Use the fallback link below.`;
      launchResult.append(heading, summary);

      if (data.email?.id) {
        const provider = document.createElement("p");
        provider.className = "match-id";
        provider.textContent = `Resend delivery ID: ${data.email.id}`;
        launchResult.append(provider);
      }

      if (data.match?.id) {
        const matchId = document.createElement("p");
        matchId.className = "match-id";
        matchId.textContent = `Match ID: ${data.match.id}`;
        launchResult.append(matchId);
        if (deliveryMatchId) deliveryMatchId.value = data.match.id;
      }

      if (data.firstTurnUrl) {
        const actions = document.createElement("div");
        actions.className = "result-actions";
        const link = document.createElement("a");
        link.className = "secondary result-link";
        link.textContent = "Open first turn";
        link.target = "_blank";
        link.rel = "noopener";
        link.href = data.firstTurnUrl;
        const copy = document.createElement("button");
        copy.className = "secondary";
        copy.type = "button";
        copy.textContent = "Copy turn link";
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(data.firstTurnUrl);
            showToast("Turn link copied.");
          } catch {
            showToast("Copy failed. Open the link and copy it from the address bar.");
          }
        });
        actions.append(link, copy);
        launchResult.append(actions);
      }
    }

    document.getElementById("check-backend").addEventListener("click", checkMissionControl);

    document.getElementById("check-delivery").addEventListener("click", async () => {
      const matchId = deliveryMatchId.value.trim();
      const testCode = testCodeInput.value.trim();
      deliveryResult.hidden = false;
      deliveryResult.textContent = "Checking the pending turn and email delivery…";
      if (!matchId || testCode.length < 12) {
        deliveryResult.textContent = "Enter the match ID and private email-test code first.";
        return;
      }
      try {
        const response = await fetch("/.netlify/functions/test-match-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Mailgames-Test-Code": testCode
          },
          body: JSON.stringify({ matchId })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Delivery check failed (${response.status})`);
        deliveryResult.replaceChildren();
        if (!data.pending) {
          deliveryResult.textContent = data.match?.status === "completed"
            ? "This match is complete; no pending turn remains."
            : "No pending turn was found.";
          return;
        }
        const details = document.createElement("div");
        details.className = "delivery-status-grid";
        const rows = [
          `Pending player: ${data.pending.recipient?.name || data.pending.actor} (${data.pending.recipient?.email || "hidden"})`,
          `Role: ${data.pending.role}`,
          `Delivery: ${data.pending.delivery?.status || "pending"}`,
          data.pending.delivery?.providerId ? `Resend ID: ${data.pending.delivery.providerId}` : "",
          data.pending.delivery?.error ? `Provider error: ${data.pending.delivery.error}` : ""
        ].filter(Boolean);
        rows.forEach(text => {
          const row = document.createElement("span");
          row.textContent = text;
          details.append(row);
        });
        deliveryResult.append(details);
        if (data.pending.recoveryTurnUrl) {
          const link = document.createElement("a");
          link.className = "secondary result-link";
          link.href = data.pending.recoveryTurnUrl;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = "Open pending turn securely";
          deliveryResult.append(link);
        }
      } catch (error) {
        deliveryResult.textContent = error.message;
      }
    });

    launchForm.addEventListener("submit", async event => {
      event.preventDefault();
      const questions = getQuestions();
      if (!questions.length) {
        setLaunchMessage("fail", "No questions available", "Add or import at least one question before launching a match.");
        return;
      }
      if (questions.length > 100) {
        setLaunchMessage("fail", "Question bank too large", "Mission Control accepts up to 100 questions per match. Delete or export some questions first.");
        return;
      }

      const formData = new FormData(launchForm);
      const testCode = String(formData.get("testCode") || "").trim();
      if (testCode.length < 12) {
        setLaunchMessage("fail", "Private code required", "Enter the MAILGAMES_TEST_CODE value configured in Netlify.");
        return;
      }

      const payload = {
        gameType: String(formData.get("gameType")),
        packName: String(formData.get("packName") || "Class revision match").trim(),
        playerA: {
          name: String(formData.get("playerAName") || "").trim(),
          email: String(formData.get("playerAEmail") || "").trim()
        },
        playerB: {
          name: String(formData.get("playerBName") || "").trim(),
          email: String(formData.get("playerBEmail") || "").trim()
        },
        questions: questions.map(({ id, ...question }) => question)
      };

      launchButton.disabled = true;
      launchButton.textContent = "Creating match…";
      setLaunchMessage("working", "Launching match", "Creating the private question pack and first turn…");

      try {
        const response = await fetch("/.netlify/functions/create-match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Mailgames-Test-Code": testCode
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Match creation failed (${response.status})`);
        showCreatedMatch(data);
        await checkMissionControl();
      } catch (error) {
        setLaunchMessage(
          "fail",
          "Match not created",
          `${error.message}. Check Mission Control above and confirm the Supabase schema and Netlify variables are configured.`
        );
        await checkMissionControl();
      } finally {
        launchButton.disabled = false;
        launchButton.textContent = "Create match and send turn";
      }
    });

    document.getElementById("question-search").addEventListener("input", refreshQuestionList);
    document.getElementById("level-filter").addEventListener("change", refreshQuestionList);
    refreshQuestionList();
    checkMissionControl();
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function parseQuestionCsv(text) {
    const rows = parseCsvRows(text);
    if (rows.length < 2) return [];
    const headers = rows[0].map(header => normalize(header).replace(/\s/g, "_"));
    return rows.slice(1).map(row => {
      const record = Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
      const type = record.type || "multiple-choice";
      return {
        id: crypto.randomUUID(),
        prompt: record.question,
        type,
        options: type === "gap-fill" ? [] : [record.option_a, record.option_b, record.option_c, record.option_d].filter(Boolean),
        answer: record.answer,
        explanation: record.explanation,
        level: record.level || "B1",
        tag: record.tag || "Imported"
      };
    }).filter(question => question.prompt && question.answer && (question.type === "gap-fill" || question.options.length >= 2));
  }

  function refreshQuestionList() {
    const list = document.getElementById("question-list");
    if (!list) return;
    const search = normalize(document.getElementById("question-search")?.value);
    const level = document.getElementById("level-filter")?.value || "all";
    const questions = getQuestions();
    const filtered = questions.filter(question => {
      const haystack = normalize(`${question.prompt} ${question.tag} ${question.answer}`);
      return (!search || haystack.includes(search)) && (level === "all" || question.level === level);
    });

    document.getElementById("question-count").textContent = `${questions.length} question${questions.length === 1 ? "" : "s"}`;
    const launchSummary = document.getElementById("launch-question-summary");
    if (launchSummary) {
      launchSummary.textContent = questions.length
        ? `${questions.length} question${questions.length === 1 ? "" : "s"} will be copied into this match.`
        : "Add at least one question before launching a match.";
    }
    list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No questions match this filter. Even the grammar goblins have gone home.";
      list.append(empty);
      return;
    }

    filtered.forEach(question => {
      const item = document.createElement("article");
      item.className = "question-item";
      item.innerHTML = `
        <div>
          <h3>${escapeHtml(question.prompt)}</h3>
          <p>Answer: <strong>${escapeHtml(question.answer)}</strong>${question.explanation ? ` · ${escapeHtml(question.explanation)}` : ""}</p>
          <div class="question-meta">
            <span class="chip">${escapeHtml(question.level)}</span>
            <span class="chip">${escapeHtml(question.tag || "General English")}</span>
            <span class="chip">${escapeHtml(question.type)}</span>
          </div>
        </div>
        <button class="danger" type="button">Delete</button>
      `;
      item.querySelector("button").addEventListener("click", () => {
        saveQuestions(getQuestions().filter(q => q.id !== question.id));
        refreshQuestionList();
        showToast("Question deleted.");
      });
      list.append(item);
    });
  }

  function renderPlay() {
    app.append(cloneTemplate("play-template"));
    document.getElementById("reset-demo").addEventListener("click", () => {
      localStorage.removeItem(STORAGE.penalty);
      localStorage.removeItem(STORAGE.turkey);
      localStorage.removeItem(STORAGE.sniper);
      renderActiveGame();
      showToast("Demo matches reset.");
    });

    document.querySelectorAll("[data-play-game]").forEach(button => {
      const isActive = button.dataset.playGame === activePlayGame;
      button.setAttribute("aria-selected", String(isActive));
      button.addEventListener("click", () => {
        activePlayGame = button.dataset.playGame;
        document.querySelectorAll("[data-play-game]").forEach(tab => tab.setAttribute("aria-selected", String(tab === button)));
        renderActiveGame();
      });
    });
    renderActiveGame();
  }

  function renderActiveGame() {
    const stage = document.getElementById("demo-stage");
    if (!stage) return;
    stage.replaceChildren();
    answerState = null;
    if (activePlayGame === "turkey") renderTurkeyGame(stage);
    else if (activePlayGame === "sniper") renderSniperGame(stage);
    else renderPenaltyGame(stage);
  }

  function defaultPenaltyState() {
    return {
      kickIndex: 0,
      scoreA: 0,
      scoreB: 0,
      phase: "striker",
      shot: null,
      shotActive: false,
      keeperMove: null,
      keeperActive: false,
      history: [],
      finished: false
    };
  }

  function getPenaltyState() {
    try { return { ...defaultPenaltyState(), ...JSON.parse(localStorage.getItem(STORAGE.penalty)) }; }
    catch { return defaultPenaltyState(); }
  }

  function savePenaltyState(state) {
    localStorage.setItem(STORAGE.penalty, JSON.stringify(state));
  }

  function penaltyPlayers(state) {
    const playerAIsStriker = state.kickIndex % 2 === 0;
    return {
      striker: playerAIsStriker ? "Player A" : "Player B",
      keeper: playerAIsStriker ? "Player B" : "Player A",
      strikerKey: playerAIsStriker ? "A" : "B"
    };
  }

  function renderPenaltyGame(stage) {
    stage.append(cloneTemplate("penalty-demo-template"));
    const state = getPenaltyState();
    const players = penaltyPlayers(state);
    document.getElementById("striker-name").textContent = players.striker;
    document.getElementById("keeper-name").textContent = players.keeper;
    document.getElementById("penalty-score").textContent = `${state.scoreA}–${state.scoreB}`;
    document.getElementById("round-label").textContent = state.finished ? "Full time" : `Kick ${state.kickIndex + 1} of 10`;

    const log = document.getElementById("penalty-log");
    if (state.history.length) log.textContent = state.history[state.history.length - 1];

    const gridButtons = [...document.querySelectorAll("#goal-grid button")];
    gridButtons.forEach(button => button.disabled = true);

    if (state.finished) renderPenaltyFinished(state);
    else renderPenaltyTurn(state);
  }

  function renderPenaltyTurn(state) {
    const panel = document.getElementById("penalty-turn-panel");
    const players = penaltyPlayers(state);
    const isStriker = state.phase === "striker";
    const player = isStriker ? players.striker : players.keeper;
    const role = isStriker ? "Take the shot" : "Make the save";
    const intro = isStriker
      ? "Answer correctly to activate your shot, then choose a goal zone."
      : "Answer correctly to activate your dive, then predict the shot zone.";

    panel.innerHTML = `
      <div class="turn-status">
        <div><span class="eyebrow">Current turn</span><strong>${escapeHtml(player)}</strong></div>
        <span class="avatar-dot">${player.slice(-1)}</span>
      </div>
      <h2>${role}</h2>
      <p>${intro}</p>
      <div id="penalty-question-slot"></div>
    `;

    renderQuestionInteraction(document.getElementById("penalty-question-slot"), {
      moveLabel: isStriker ? "Choose shot direction" : "Choose dive direction",
      moves: penaltyZones.map(([id, label]) => ({ id, label })),
      submitLabel: isStriker ? "Lock shot" : "Lock save",
      onComplete: ({ correct, move }) => {
        if (isStriker) {
          state.shot = move;
          state.shotActive = correct;
          state.phase = "keeper";
          savePenaltyState(state);
          document.getElementById("penalty-log").textContent = correct
            ? `${players.striker} answered correctly and locked a live shot.`
            : `${players.striker}'s answer was incorrect. The shot will be futile.`;
          setTimeout(() => renderActiveGame(), 650);
        } else {
          state.keeperMove = move;
          state.keeperActive = correct;
          resolvePenalty(state);
        }
      }
    });
  }

  function resolvePenalty(state) {
    const players = penaltyPlayers(state);
    let goal = false;
    let message = "";
    if (!state.shotActive) {
      message = state.keeperActive
        ? `${players.striker}'s powerless shot is comfortably stopped by ${players.keeper}.`
        : `Both answers were incorrect. The ball wanders wide while the keeper dives into another postcode.`;
    } else if (!state.keeperActive) {
      goal = true;
      message = `${players.striker} scores! ${players.keeper}'s incorrect answer made the save futile.`;
    } else if (state.shot === state.keeperMove) {
      message = `${players.keeper} predicts ${zoneLabel(state.shot)} and makes the save!`;
    } else {
      goal = true;
      message = `${players.striker} sends it ${zoneLabel(state.shot)} while ${players.keeper} dives ${zoneLabel(state.keeperMove)}. Goal!`;
    }

    if (goal) {
      if (players.strikerKey === "A") state.scoreA += 1;
      else state.scoreB += 1;
    }
    state.history.push(message);
    animatePenalty(state, goal, () => {
      state.kickIndex += 1;
      state.phase = "striker";
      state.shot = null;
      state.keeperMove = null;
      state.shotActive = false;
      state.keeperActive = false;
      state.finished = state.kickIndex >= 10;
      savePenaltyState(state);
      renderActiveGame();
    });
  }

  function animatePenalty(state, goal, done) {
    const ball = document.getElementById("football");
    const keeper = document.getElementById("keeper-character");
    const log = document.getElementById("penalty-log");
    const shotPos = zonePosition(state.shot || "bottom-centre");
    const keepPos = zonePosition(state.keeperMove || "bottom-centre");
    if (ball) {
      ball.style.left = `${shotPos.x}%`;
      ball.style.bottom = `${shotPos.y}%`;
      ball.style.transform = "scale(.78) rotate(360deg)";
    }
    if (keeper) {
      keeper.style.left = `${keepPos.x}%`;
      keeper.style.top = `${100 - keepPos.y - 25}%`;
      keeper.style.transform = `translateX(-50%) rotate(${keepPos.x < 50 ? -35 : keepPos.x > 50 ? 35 : 0}deg)`;
    }
    if (log) {
      log.textContent = state.history[state.history.length - 1];
      log.classList.add(goal ? "flash" : "shake");
    }
    setTimeout(done, 1700);
  }

  function renderPenaltyFinished(state) {
    const panel = document.getElementById("penalty-turn-panel");
    const result = state.scoreA === state.scoreB ? "The match is a draw." : `${state.scoreA > state.scoreB ? "Player A" : "Player B"} wins!`;
    panel.innerHTML = `
      <span class="eyebrow">Full time</span>
      <h2>${escapeHtml(result)}</h2>
      <p>Final score: <strong>${state.scoreA}–${state.scoreB}</strong>. Language accuracy powered every successful action.</p>
      <button class="primary full" id="new-penalty-match">Start a new match</button>
      ${emailInviteMarkup("Mail Penalty Shootout")}
    `;
    document.getElementById("new-penalty-match").addEventListener("click", () => {
      localStorage.removeItem(STORAGE.penalty);
      renderActiveGame();
    });
    bindEmailInvite(panel, "Mail Penalty Shootout");
  }

  function zoneLabel(zone) {
    return penaltyZones.find(([id]) => id === zone)?.[1]?.toLowerCase() || "centre";
  }

  function zonePosition(zone) {
    const map = {
      "top-left": { x: 33, y: 58 }, "top-centre": { x: 50, y: 58 }, "top-right": { x: 67, y: 58 },
      "bottom-left": { x: 33, y: 40 }, "bottom-centre": { x: 50, y: 40 }, "bottom-right": { x: 67, y: 40 }
    };
    return map[zone] || map["bottom-centre"];
  }

  function defaultTurkeyState() {
    return {
      round: 1,
      phase: "A",
      healthA: 100,
      healthB: 100,
      streakA: 0,
      streakB: 0,
      moveA: null,
      moveB: null,
      activeA: false,
      activeB: false,
      history: [],
      finished: false
    };
  }

  function getTurkeyState() {
    try { return { ...defaultTurkeyState(), ...JSON.parse(localStorage.getItem(STORAGE.turkey)) }; }
    catch { return defaultTurkeyState(); }
  }

  function saveTurkeyState(state) {
    localStorage.setItem(STORAGE.turkey, JSON.stringify(state));
  }

  function renderTurkeyGame(stage) {
    stage.append(cloneTemplate("turkey-demo-template"));
    const state = getTurkeyState();
    document.getElementById("turkey-round").textContent = state.finished ? "Fight over" : `Round ${state.round}`;
    document.getElementById("turkey-health-a").style.width = `${Math.max(0, state.healthA)}%`;
    document.getElementById("turkey-health-b").style.width = `${Math.max(0, state.healthB)}%`;
    const log = document.getElementById("turkey-log");
    if (state.history.length) log.textContent = state.history[state.history.length - 1];
    if (state.finished) renderTurkeyFinished(state);
    else renderTurkeyTurn(state);
  }

  function renderTurkeyTurn(state) {
    const panel = document.getElementById("turkey-turn-panel");
    const isA = state.phase === "A";
    const player = isA ? "Sir Gobbles" : "Ninja Wing";
    const streak = isA ? state.streakA : state.streakB;
    panel.innerHTML = `
      <div class="turn-status">
        <div><span class="eyebrow">Current fighter</span><strong>${player}</strong></div>
        <span class="avatar-dot">${isA ? "G" : "N"}</span>
      </div>
      <h2>Activate a move</h2>
      <p>Correct answers make moves effective. Current correct-answer streak: <strong>${streak}</strong>.</p>
      <div id="turkey-question-slot"></div>
    `;

    renderQuestionInteraction(document.getElementById("turkey-question-slot"), {
      moveLabel: "Choose attack or defence",
      moves: turkeyMoves,
      submitLabel: "Lock turkey move",
      onComplete: ({ correct, move }) => {
        if (isA) {
          state.moveA = move;
          state.activeA = correct;
          state.streakA = correct ? state.streakA + 1 : 0;
          state.phase = "B";
          saveTurkeyState(state);
          document.getElementById("turkey-log").textContent = correct
            ? `Sir Gobbles answered correctly and prepared ${moveLabel(move)}.`
            : `Sir Gobbles answered incorrectly. The chosen move will be futile.`;
          setTimeout(() => renderActiveGame(), 650);
        } else {
          state.moveB = move;
          state.activeB = correct;
          state.streakB = correct ? state.streakB + 1 : 0;
          resolveTurkeyRound(state);
        }
      }
    });
  }

  function resolveTurkeyRound(state) {
    const resultA = calculateTurkeyAttack(state.moveA, state.activeA, state.moveB, state.activeB);
    const resultB = calculateTurkeyAttack(state.moveB, state.activeB, state.moveA, state.activeA);
    state.healthB = Math.max(0, state.healthB - resultA.damage);
    state.healthA = Math.max(0, state.healthA - resultB.damage);

    const parts = [];
    if (!state.activeA) parts.push("Sir Gobbles' move fizzles after an incorrect answer");
    else parts.push(`Sir Gobbles uses ${moveLabel(state.moveA)}${resultA.damage ? ` for ${resultA.damage} damage` : " successfully"}`);
    if (!state.activeB) parts.push("Ninja Wing's move is futile after an incorrect answer");
    else parts.push(`Ninja Wing uses ${moveLabel(state.moveB)}${resultB.damage ? ` for ${resultB.damage} damage` : " successfully"}`);
    const message = `${parts.join("; ")}.`;
    state.history.push(message);

    animateTurkey(state, resultA, resultB, () => {
      state.finished = state.healthA <= 0 || state.healthB <= 0;
      state.round += 1;
      state.phase = "A";
      state.moveA = null;
      state.moveB = null;
      state.activeA = false;
      state.activeB = false;
      saveTurkeyState(state);
      renderActiveGame();
    });
  }

  function calculateTurkeyAttack(attackerMoveId, attackerActive, defenderMoveId, defenderActive) {
    const attack = turkeyMoves.find(move => move.id === attackerMoveId);
    const defence = turkeyMoves.find(move => move.id === defenderMoveId);
    if (!attackerActive || !attack || attack.type !== "attack") return { damage: 0, effect: "futile" };
    if (!defenderActive || !defence || defence.type !== "defence") return { damage: attack.damage, effect: "hit" };

    const counters = {
      block: { "wing-slap": 0, peck: 0, charge: 10 },
      duck: { "wing-slap": 0, peck: 8, charge: 0 },
      counter: { "wing-slap": 12, peck: 0, charge: 0 }
    };
    const damage = counters[defence.id]?.[attack.id] ?? attack.damage;
    return { damage, effect: damage ? "partial" : "blocked" };
  }

  function moveLabel(id) {
    return turkeyMoves.find(move => move.id === id)?.label || "a mysterious manoeuvre";
  }

  function animateTurkey(state, resultA, resultB, done) {
    const a = document.getElementById("turkey-a");
    const b = document.getElementById("turkey-b");
    const effect = document.getElementById("fight-effect");
    const log = document.getElementById("turkey-log");
    if (state.activeA && turkeyMoves.find(m => m.id === state.moveA)?.type === "attack") a.style.left = "35%";
    if (state.activeB && turkeyMoves.find(m => m.id === state.moveB)?.type === "attack") b.style.right = "35%";
    if (resultA.damage || resultB.damage) {
      effect.textContent = resultA.damage && resultB.damage ? "GOBBLE CLASH!" : "FEATHER HIT!";
      (resultA.damage ? b : a)?.classList.add("shake");
    } else {
      effect.textContent = "BLOCKED!";
    }
    if (log) log.textContent = state.history[state.history.length - 1];
    setTimeout(done, 1700);
  }

  function renderTurkeyFinished(state) {
    const panel = document.getElementById("turkey-turn-panel");
    let result = "A feather-filled draw!";
    if (state.healthA > state.healthB) result = "Sir Gobbles wins!";
    if (state.healthB > state.healthA) result = "Ninja Wing wins!";
    panel.innerHTML = `
      <span class="eyebrow">Fight over</span>
      <h2>${result}</h2>
      <p>Final health: Sir Gobbles <strong>${state.healthA}</strong>, Ninja Wing <strong>${state.healthB}</strong>.</p>
      <button class="primary warm full" id="new-turkey-match">Start a new fight</button>
      ${emailInviteMarkup("Turkey Fight Mail")}
    `;
    document.getElementById("new-turkey-match").addEventListener("click", () => {
      localStorage.removeItem(STORAGE.turkey);
      renderActiveGame();
    });
    bindEmailInvite(panel, "Turkey Fight Mail");
  }

  const sniperSpots = [
    { id: "rooftop", label: "1 · Rooftop" },
    { id: "upper-window", label: "2 · Upper Window" },
    { id: "broken-wall", label: "3 · Broken Wall" },
    { id: "supply-crates", label: "4 · Supply Crates" }
  ];

  function defaultSniperState() {
    return {
      round: 1,
      maxRounds: 5,
      phase: "A",
      healthA: 3,
      healthB: 3,
      emergenceA: null,
      emergenceB: null,
      targetA: null,
      targetB: null,
      activeA: false,
      activeB: false,
      history: [],
      finished: false
    };
  }

  function getSniperState() {
    try { return { ...defaultSniperState(), ...JSON.parse(localStorage.getItem(STORAGE.sniper)) }; }
    catch { return defaultSniperState(); }
  }

  function saveSniperState(state) {
    localStorage.setItem(STORAGE.sniper, JSON.stringify(state));
  }

  function renderSniperGame(stage) {
    stage.append(cloneTemplate("sniper-demo-template"));
    const state = getSniperState();
    document.getElementById("sniper-demo-health-a").textContent = state.healthA;
    document.getElementById("sniper-demo-health-b").textContent = state.healthB;
    document.getElementById("sniper-demo-round").textContent = state.finished ? "Match over" : `Round ${state.round} of ${state.maxRounds}`;
    const log = document.getElementById("sniper-demo-log");
    if (state.history.length) log.textContent = state.history[state.history.length - 1];
    if (state.finished) renderSniperFinished(state);
    else renderSniperTurn(state);
  }

  function renderSniperTurn(state) {
    const panel = document.getElementById("sniper-turn-panel");
    const actor = state.phase;
    const player = `Player ${actor}`;
    const question = randomQuestion(currentQuestionId);
    currentQuestionId = question.id;
    let submittedAnswer = "";
    let checked = false;
    let correct = false;
    let emergence = "";
    let target = "";
    const options = question.type === "gap-fill"
      ? `<input id="sniper-gap-answer" type="text" placeholder="Type your answer" autocomplete="off" />`
      : `<div class="answers">${question.options.map(option => `<button type="button" class="answer-option" data-sniper-answer="${escapeAttribute(option)}">${escapeHtml(option)}</button>`).join("")}</div>`;
    const spotButtons = kind => sniperSpots.map(spot => `<button class="move-button" type="button" data-sniper-${kind}="${spot.id}">${escapeHtml(spot.label)}</button>`).join("");

    panel.innerHTML = `
      <div class="turn-status"><div><span class="eyebrow">Current player</span><strong>${player}</strong></div><span class="avatar-dot">${actor}</span></div>
      <h2>Answer and make two secret choices</h2>
      <p>A wrong answer still reveals your cover, but disables your training shot.</p>
      <div class="question-box">
        <div class="question-context"><span class="chip">${escapeHtml(question.level)}</span><span class="chip">${escapeHtml(question.tag)}</span></div>
        <strong>${escapeHtml(question.prompt)}</strong>
        ${options}
        <button class="secondary full" type="button" id="sniper-check-answer">Check answer</button>
        <div id="sniper-answer-feedback"></div>
      </div>
      <div id="sniper-demo-choices" hidden>
        <h3>Choose your emergence spot</h3><div class="move-grid">${spotButtons("emergence")}</div>
        <h3>Predict the rival position</h3><div class="move-grid">${spotButtons("target")}</div>
        <button class="primary full" type="button" id="sniper-submit-turn" disabled>Lock both choices</button>
      </div>`;

    panel.querySelectorAll("[data-sniper-answer]").forEach(button => {
      button.addEventListener("click", () => {
        if (checked) return;
        submittedAnswer = button.dataset.sniperAnswer || "";
        panel.querySelectorAll("[data-sniper-answer]").forEach(item => item.classList.toggle("selected", item === button));
      });
    });
    panel.querySelector("#sniper-check-answer").addEventListener("click", () => {
      if (checked) return;
      const answer = question.type === "gap-fill" ? panel.querySelector("#sniper-gap-answer").value : submittedAnswer;
      if (!String(answer || "").trim()) return showToast("Choose or type an answer first.");
      checked = true;
      correct = normalize(answer) === normalize(question.answer);
      const feedback = panel.querySelector("#sniper-answer-feedback");
      feedback.className = `feedback ${correct ? "success" : "fail"}`;
      feedback.innerHTML = correct
        ? `Correct. Your training shot is active.${question.explanation ? ` ${escapeHtml(question.explanation)}` : ""}`
        : `Not quite. Correct answer: <strong>${escapeHtml(question.answer)}</strong>. You will still emerge, but cannot score a tag.`;
      panel.querySelector("#sniper-check-answer").disabled = true;
      panel.querySelector("#sniper-demo-choices").hidden = false;
    });

    function syncReady() {
      panel.querySelector("#sniper-submit-turn").disabled = !(checked && emergence && target);
    }
    panel.querySelectorAll("[data-sniper-emergence]").forEach(button => {
      button.addEventListener("click", () => {
        emergence = button.dataset.sniperEmergence || "";
        panel.querySelectorAll("[data-sniper-emergence]").forEach(item => item.classList.toggle("selected", item === button));
        syncReady();
      });
    });
    panel.querySelectorAll("[data-sniper-target]").forEach(button => {
      button.addEventListener("click", () => {
        target = button.dataset.sniperTarget || "";
        panel.querySelectorAll("[data-sniper-target]").forEach(item => item.classList.toggle("selected", item === button));
        syncReady();
      });
    });
    panel.querySelector("#sniper-submit-turn").addEventListener("click", () => {
      state[`emergence${actor}`] = emergence;
      state[`target${actor}`] = target;
      state[`active${actor}`] = correct;
      if (actor === "A") {
        state.phase = "B";
        state.history.push(correct
          ? "Player A locked two hidden choices with an active training shot."
          : "Player A locked a cover position, but the incorrect answer disabled the shot.");
        saveSniperState(state);
        renderActiveGame();
      } else {
        resolveSniperRound(state);
      }
    });
  }

  function resolveSniperRound(state) {
    const hitByA = Boolean(state.activeA && state.targetA === state.emergenceB);
    const hitByB = Boolean(state.activeB && state.targetB === state.emergenceA);
    state.healthB = Math.max(0, state.healthB - (hitByA ? 1 : 0));
    state.healthA = Math.max(0, state.healthA - (hitByB ? 1 : 0));
    const message = hitByA && hitByB
      ? "Double tag—both students predicted the rival position."
      : hitByA
        ? "Player A predicted Player B's position and scores a training tag."
        : hitByB
          ? "Player B predicted Player A's position and scores a training tag."
          : "No tag—both predictions miss or a shot was disabled.";
    state.history.push(message);
    const effect = document.getElementById("sniper-demo-effect");
    if (effect) effect.textContent = hitByA && hitByB ? "DOUBLE TAG" : hitByA ? "A TAGS B" : hitByB ? "B TAGS A" : "MISS";
    document.getElementById("sniper-demo-log").textContent = message;
    state.finished = state.healthA <= 0 || state.healthB <= 0 || state.round >= state.maxRounds;
    state.round += 1;
    state.phase = "A";
    state.emergenceA = state.emergenceB = state.targetA = state.targetB = null;
    state.activeA = state.activeB = false;
    saveSniperState(state);
    setTimeout(renderActiveGame, 1300);
  }

  function renderSniperFinished(state) {
    const panel = document.getElementById("sniper-turn-panel");
    const result = state.healthA === state.healthB ? "Training draw" : state.healthA > state.healthB ? "Player A wins" : "Player B wins";
    panel.innerHTML = `
      <span class="eyebrow">Match complete</span>
      <h2>${result}</h2>
      <p>Final health: Player A <strong>${state.healthA}</strong>, Player B <strong>${state.healthB}</strong>.</p>
      <button class="primary full" id="new-sniper-match">Start a new prediction match</button>
      ${emailInviteMarkup("Sniper Elite!")}`;
    panel.querySelector("#new-sniper-match").addEventListener("click", () => {
      localStorage.removeItem(STORAGE.sniper);
      renderActiveGame();
    });
    bindEmailInvite(panel, "Sniper Elite!");
  }

  function renderQuestionInteraction(container, config) {
    const question = randomQuestion(currentQuestionId);
    currentQuestionId = question.id;
    answerState = { selected: null, checked: false, correct: false, move: null };
    const optionsHtml = question.type === "gap-fill"
      ? `<input id="gap-answer" type="text" placeholder="Type your answer" autocomplete="off" />`
      : `<div class="answers">${question.options.map(option => `<button type="button" class="answer-option" data-answer="${escapeAttribute(option)}">${escapeHtml(option)}</button>`).join("")}</div>`;

    container.innerHTML = `
      <div class="question-box">
        <div class="question-context"><span class="chip">${escapeHtml(question.level)}</span><span class="chip">${escapeHtml(question.tag)}</span></div>
        <strong>${escapeHtml(question.prompt)}</strong>
        ${optionsHtml}
        <button type="button" class="secondary full" id="check-answer">Check answer</button>
        <div id="answer-feedback"></div>
      </div>
      <div id="move-section" hidden>
        <h3>${escapeHtml(config.moveLabel)}</h3>
        <div class="move-grid">
          ${config.moves.map(move => `<button type="button" class="move-button" data-move="${escapeAttribute(move.id)}">${escapeHtml(move.label)}${move.note ? `<span class="move-description">${escapeHtml(move.note)}</span>` : ""}</button>`).join("")}
        </div>
        <button type="button" class="primary full" id="submit-move" disabled>${escapeHtml(config.submitLabel)}</button>
      </div>
    `;

    container.querySelectorAll("[data-answer]").forEach(button => {
      button.addEventListener("click", () => {
        if (answerState.checked) return;
        answerState.selected = button.dataset.answer;
        container.querySelectorAll("[data-answer]").forEach(option => option.classList.toggle("selected", option === button));
      });
    });

    container.querySelector("#check-answer").addEventListener("click", () => {
      if (answerState.checked) return;
      const submitted = question.type === "gap-fill"
        ? container.querySelector("#gap-answer").value
        : answerState.selected;
      if (!String(submitted || "").trim()) {
        showToast("Choose or type an answer first.");
        return;
      }
      answerState.checked = true;
      answerState.correct = normalize(submitted) === normalize(question.answer);
      const feedback = container.querySelector("#answer-feedback");
      feedback.className = `feedback ${answerState.correct ? "success" : "fail"}`;
      feedback.innerHTML = answerState.correct
        ? `Correct. Your move is live.${question.explanation ? ` ${escapeHtml(question.explanation)}` : ""}`
        : `Not quite. Correct answer: <strong>${escapeHtml(question.answer)}</strong>. Your selected move will be futile.`;
      container.querySelector("#check-answer").disabled = true;
      container.querySelectorAll("[data-answer]").forEach(button => {
        const isCorrect = normalize(button.dataset.answer) === normalize(question.answer);
        if (isCorrect) button.classList.add("correct");
        else if (button.classList.contains("selected")) button.classList.add("incorrect");
      });
      container.querySelector("#move-section").hidden = false;
    });

    container.querySelectorAll("[data-move]").forEach(button => {
      button.addEventListener("click", () => {
        answerState.move = button.dataset.move;
        container.querySelectorAll("[data-move]").forEach(move => move.classList.toggle("selected", move === button));
        container.querySelector("#submit-move").disabled = false;
      });
    });

    container.querySelector("#submit-move").addEventListener("click", () => {
      if (!answerState.checked || !answerState.move) return;
      config.onComplete({ correct: answerState.correct, move: answerState.move, question });
    });
  }

  function emailInviteMarkup(gameName) {
    return `
      <div class="email-preview">
        <small>Email continuation scaffold</small>
        <strong>Challenge another player</strong>
        <label>Opponent email<input type="email" class="invite-email" placeholder="student@example.com" /></label>
        <button class="secondary full send-invite" type="button" data-game-name="${escapeAttribute(gameName)}">Send demo invitation</button>
      </div>
    `;
  }

  function bindEmailInvite(container, gameName) {
    const button = container.querySelector(".send-invite");
    button?.addEventListener("click", async () => {
      const email = container.querySelector(".invite-email")?.value.trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showToast("Enter a valid email address.");
        return;
      }
      button.disabled = true;
      button.textContent = "Sending…";
      try {
        const response = await fetch("/.netlify/functions/send-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            gameName,
            playerName: "A classmate",
            turnUrl: `${location.origin}${location.pathname}#play`
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Email service is not configured");
        showToast("Invitation sent.");
      } catch (error) {
        showToast(`Invite not sent: ${error.message}`);
      } finally {
        button.disabled = false;
        button.textContent = "Send demo invitation";
      }
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "home";
  else render();
})();
