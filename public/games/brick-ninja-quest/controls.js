(function () {
  if (window.__brickNinjaKidPatchApplied) return;
  window.__brickNinjaKidPatchApplied = true;

  const style = document.createElement("style");
  style.textContent = `
    button:focus,
    button.character:focus {
      outline: 5px solid #ff3b30;
      outline-offset: 3px;
      filter: brightness(1.05);
    }

    button.character {
      font: inherit;
      color: #12203a;
      background: #ffffff;
      border: 4px solid rgba(30, 34, 48, 0.18);
      border-radius: 18px;
      box-shadow: 0 6px 0 rgba(30, 34, 48, 0.14);
      padding: 12px;
      margin: 0;
      width: 152px;
      cursor: default;
      text-align: center;
    }

    button.character.selected {
      border-color: #a86a00;
      background: #fff8dd;
      transform: scale(1.04);
      box-shadow: 0 8px 0 rgba(168, 106, 0, 0.22);
    }
  `;
  document.head.appendChild(style);

  // Add pause screen
  if (!document.getElementById("pause-screen")) {
    const pauseScreen = document.createElement("div");
    pauseScreen.id = "pause-screen";
    pauseScreen.className = "screen hidden";
    pauseScreen.innerHTML = `
      <div class="card">
        <h2>Paused</h2>
        <p>Use ✛ and A on the controller, or arrow keys and Enter.</p>
        <button id="btn-pause-resume">Resume</button>
        <button id="btn-pause-levels">Choose Level</button>
        <button id="btn-pause-title">Title</button>
      </div>
    `;
    document.body.appendChild(pauseScreen);
  }

  // Add Back button on level intro screen
  if (!document.getElementById("btn-intro-back")) {
    const introCard = document.querySelector("#level-intro-screen .card");
    const playBtn = document.getElementById("btn-level-play");

    if (introCard && playBtn) {
      const back = document.createElement("button");
      back.id = "btn-intro-back";
      back.textContent = "Back to Levels";
      introCard.insertBefore(back, playBtn);

      back.onclick = function () {
        buildLevelSelect();
        showScreen("level-screen");
      };
    }
  }

  // Make title Continue safer: Continue resumes progress, Level Select is separate
  const btnContinue = document.getElementById("btn-continue");

  if (btnContinue) {
    btnContinue.textContent = "Continue";

    btnContinue.onclick = function () {
      ensureAudio();
      currentLevel = Math.min(unlocked, LEVELS.length - 1);
      showLevelIntro();
    };

    if (!document.getElementById("btn-levels-title")) {
      const levelsBtn = document.createElement("button");
      levelsBtn.id = "btn-levels-title";
      levelsBtn.textContent = "Level Select";
      btnContinue.insertAdjacentElement("afterend", levelsBtn);

      levelsBtn.onclick = function () {
        ensureAudio();
        buildLevelSelect();
        showScreen("level-screen");
      };
    }
  }

  function getActiveScreen() {
    return document.querySelector(".screen:not(.hidden)");
  }

  function getMenuTargets() {
    const screen = getActiveScreen();
    if (!screen) return [];

    return Array.from(screen.querySelectorAll("button:not(:disabled)")).filter(
      function (el) {
        return el.getClientRects().length > 0;
      }
    );
  }

  function focusPreferred() {
    const screen = getActiveScreen();
    if (!screen) return;

    let el = null;

    if (screen.id === "title-screen") {
      el = document.getElementById("btn-continue");
    } else if (screen.id === "select-screen") {
      const chars = screen.querySelectorAll("button.character");
      el = chars[selectedChar] || chars[0];
    } else if (screen.id === "story-screen") {
      el = document.getElementById("btn-story-begin");
    } else if (screen.id === "level-screen") {
      const wrap = document.getElementById("level-buttons");
      const idx = Math.min(unlocked, LEVELS.length - 1);

      if (wrap && wrap.children[idx] && !wrap.children[idx].disabled) {
        el = wrap.children[idx];
      } else if (wrap) {
        el = Array.from(wrap.children).find(function (b) {
          return !b.disabled;
        });
      }
    } else if (screen.id === "level-intro-screen") {
      el = document.getElementById("btn-level-play");
    } else if (screen.id === "complete-screen") {
      el = document.getElementById("btn-next");
    } else if (screen.id === "fail-screen") {
      el = document.getElementById("btn-fail-retry");
    } else if (screen.id === "pause-screen") {
      el = document.getElementById("btn-pause-resume");
    } else if (screen.id === "final-screen") {
      el = document.getElementById("btn-final-restart");
    }

    if (el && !el.disabled) {
      el.focus();
    } else {
      const targets = getMenuTargets();
      if (targets[0]) targets[0].focus();
    }
  }

  // Override showScreen so keyboard focus is always moved correctly
  const originalShowScreen = showScreen;
  showScreen = function (id) {
    originalShowScreen(id);
    setTimeout(focusPreferred, 0);
  };

  // Replace character select with keyboard-only buttons
  buildCharacterSelect = function () {
    const wrap = document.getElementById("characters");
    if (!wrap) return;

    wrap.innerHTML = "";

    CHARACTERS.forEach(function (c, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "character" + (i === selectedChar ? " selected" : "");

      btn.innerHTML = `
        <div class="mini-ninja" style="--c:${c.color}"></div>
        <div><strong>${c.name}</strong></div>
        <small>${c.desc}</small>
      `;

      btn.onclick = function () {
        selectedChar = i;
        saveProgress();
        buildCharacterSelect();

        const begin = document.getElementById("btn-begin-story");
        if (begin) begin.focus();
      };

      wrap.appendChild(btn);
    });
  };

  // Determine the correct next/resume level
  function getNextLevel() {
    if (currentLevel >= LEVELS.length - 1) return null;

    const highest = Math.min(unlocked, LEVELS.length - 1);

    if (currentLevel < highest) {
      return highest;
    }

    return currentLevel + 1;
  }

  // Override complete screen so old levels resume progress correctly
  completeLevel = function () {
    if (gameState !== "play") return;

    gameState = "complete";
    unlocked = Math.max(unlocked, currentLevel + 1);
    saveProgress();

    soundComplete();
    spawnConfetti(180);

    document.getElementById("complete-title").textContent = randomPraise();
    document.getElementById("complete-text").textContent =
      "You collected " +
      level.starsGot +
      "/" +
      level.starsTotal +
      " Star Bricks and opened the Golden Portal!";

    document.getElementById("complete-stars").textContent =
      "⭐".repeat(level.starsGot) +
      "☆".repeat(Math.max(0, level.starsTotal - level.starsGot));

    const next = getNextLevel();

    document.getElementById("btn-next").textContent =
      next === null
        ? "Finish Quest"
        : next === currentLevel + 1
          ? "Next Level"
          : "Resume Level " + (next + 1);

    showScreen("complete-screen");
  };

  document.getElementById("btn-next").onclick = function () {
    const next = getNextLevel();

    if (next === null) {
      showFinal();
    } else {
      currentLevel = next;
      showLevelIntro();
    }
  };

  // Pause menu
  function openPause() {
    if (gameState !== "play") return;
    input.left = input.right = input.jump = jumpQueued = false;
    gameState = "pause";
    showScreen("pause-screen");
  }

  function closePause() {
    if (gameState !== "pause") return;
    gameState = "play";
    showScreen(null);
    setGameUIVisible(true);
  }

  document.getElementById("btn-pause-resume").onclick = closePause;

  document.getElementById("btn-pause-levels").onclick = function () {
    gameState = "intro";
    buildLevelSelect();
    showScreen("level-screen");
  };

  document.getElementById("btn-pause-title").onclick = function () {
    gameState = "title";
    showScreen("title-screen");
  };

  document.getElementById("touch-pause").onclick = () => { ensureAudio(); openPause(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden) openPause(); });

  // Keyboard and controller menu control
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.target.matches("input, textarea")) return;
      if (typeof ensureAudio === "function") ensureAudio();

      const code = e.code;

      // During gameplay, Esc/P opens pause
      if (gameState === "play") {
        if (code === "Escape" || code === "KeyP") {
          e.preventDefault();
          e.stopImmediatePropagation();
          openPause();
        }
        return;
      }

      // During pause, Esc/P resumes
      if (gameState === "pause") {
        if (code === "Escape" || code === "KeyP") {
          e.preventDefault();
          e.stopImmediatePropagation();
          closePause();
          return;
        }
      }

      const screen = getActiveScreen();
      if (!screen) return;

      // Esc acts as Back in menus
      if (code === "Escape") {
        if (screen.id === "level-intro-screen") {
          e.preventDefault();
          e.stopImmediatePropagation();
          buildLevelSelect();
          showScreen("level-screen");
          return;
        }

        if (
          screen.id === "level-screen" ||
          screen.id === "select-screen" ||
          screen.id === "story-screen"
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showScreen("title-screen");
          return;
        }
      }

      const targets = getMenuTargets();
      if (!targets.length) return;

      let idx = targets.indexOf(document.activeElement);

      if (
        code === "ArrowRight" ||
        code === "ArrowDown" ||
        (code === "Tab" && !e.shiftKey)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();

        idx = idx < 0 ? 0 : (idx + 1) % targets.length;
        targets[idx].focus();
      } else if (
        code === "ArrowLeft" ||
        code === "ArrowUp" ||
        (code === "Tab" && e.shiftKey)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();

        idx = idx < 0 ? targets.length - 1 : (idx - 1 + targets.length) % targets.length;
        targets[idx].focus();
      } else if (code === "Enter" || code === "Space") {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (idx >= 0 && !targets[idx].disabled) {
          targets[idx].click();
        } else if (targets[0]) {
          targets[0].focus();
        }
      }
    },
    true
  );

  // Controller (AGENTS.md section 9), read only through GamepadStd.
  // In play: d-pad / stick = input.left / input.right, A = exactly the Space key (jumpQueued + held jump),
  // B or Start = pause. In pause: B or Start = resume. In menus: d-pad / stick, A and B are dispatched as the
  // ArrowX / Enter / Escape keys so focus movement and activation take the exact keyboard path above.
  const PAD_KEYS = {
    ArrowLeft: ["ArrowLeft", 37], ArrowRight: ["ArrowRight", 39], ArrowUp: ["ArrowUp", 38], ArrowDown: ["ArrowDown", 40],
    Enter: ["Enter", 13], Escape: ["Escape", 27]
  };
  function padKey(code) {
    const info = PAD_KEYS[code];
    ["keydown", "keyup"].forEach(function (type) {
      const ev = new KeyboardEvent(type, { key: info[0], code: code, keyCode: info[1], which: info[1], bubbles: true, cancelable: true });
      try {
        Object.defineProperty(ev, "keyCode", { get: function () { return info[1]; } });
        Object.defineProperty(ev, "which", { get: function () { return info[1]; } });
      } catch (e) {}
      ev.gamepadStd = true;
      document.body.dispatchEvent(ev);
    });
  }
  const padPrev = { left: false, right: false };
  function pollPad() {
    if (!window.GamepadStd) return;
    for (const p of GamepadStd.read("game")) {
      if (p.any || p.left || p.right || p.up || p.down) ensureAudio();
      const nav = GamepadStd.navRepeat(p, "game");
      if (p.left !== padPrev.left) input.left = p.left;
      if (p.right !== padPrev.right) input.right = p.right;
      padPrev.left = p.left;
      padPrev.right = p.right;
      if (p.released.A) input.jump = false;
      if (gameState === "play") {
        if (p.just.A) {
          if (!input.jump) jumpQueued = true;
          input.jump = true;
        }
        if (p.just.B || p.just.start) openPause();
        continue;
      }
      if (gameState === "pause" && p.just.start) { closePause(); continue; }
      if (p.just.B) padKey("Escape");
      if (p.just.A) padKey("Enter");
      if (nav.left) padKey("ArrowLeft");
      else if (nav.right) padKey("ArrowRight");
      else if (nav.up) padKey("ArrowUp");
      else if (nav.down) padKey("ArrowDown");
    }
  }
  (function padLoop() {
    try { pollPad(); } catch (e) { console.error("pad", e); }
    requestAnimationFrame(padLoop);
  })();

  buildCharacterSelect();
  focusPreferred();
})();
