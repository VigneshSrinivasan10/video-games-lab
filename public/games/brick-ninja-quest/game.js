"use strict";
const $ = (id) => document.getElementById(id);
    const canvas = $("game");
    const ctx = canvas.getContext("2d");

    const VIEW_W = 960;
    const VIEW_H = 540;
    const TILE = 40;
    const PI = Math.PI;

    const CHARACTERS = [
      {
        name: "Blaze",
        color: "#ff3b30",
        desc: "Fire ninja. Fast and brave.",
        speed: 285,
        jump: 700,
        extraHearts: 0,
        float: false
      },
      {
        name: "Splash",
        color: "#00a2ff",
        desc: "Water ninja. Jumps extra high.",
        speed: 255,
        jump: 780,
        extraHearts: 0,
        float: false
      },
      {
        name: "Bolt",
        color: "#ffc400",
        desc: "Lightning ninja. Super speedy.",
        speed: 320,
        jump: 690,
        extraHearts: 0,
        float: false
      },
      {
        name: "Stone",
        color: "#a86a2d",
        desc: "Earth ninja. One extra heart.",
        speed: 250,
        jump: 690,
        extraHearts: 1,
        float: false
      },
      {
        name: "Zephyr",
        color: "#2ed573",
        desc: "Wind ninja. Hold jump to float.",
        speed: 265,
        jump: 690,
        extraHearts: 0,
        float: true
      }
    ];

    const LEVELS = [
      {
        name: "Meadow of Beginnings",
        story:
          "Master Ember says: The Shadow King hid the Golden Masks in the Brick Realm. Collect 3 Star Bricks and open the portal!",
        width: 120,
        platforms: 6,
        enemies: 0,
        spikes: 0,
        gapMax: 2,
        gapChance: 0.18
      },
      {
        name: "Bamboo Forest",
        story:
          "A brick map reveals the next mask. Watch out for Shadow Sprouts! They are grumpy, but you are braver.",
        width: 135,
        platforms: 7,
        enemies: 1,
        spikes: 0,
        gapMax: 2,
        gapChance: 0.20
      },
      {
        name: "Sky Bridge",
        story:
          "Wind spirits whisper: Cross the bright sky bridge and keep your heart shining. Stars will guide your way.",
        width: 150,
        platforms: 8,
        enemies: 1,
        spikes: 1,
        gapMax: 2,
        gapChance: 0.22
      },
      {
        name: "Crystal Caverns",
        story:
          "The caverns glow with colorful crystal bricks. The Shadow King sent little shadow guards to watch the path.",
        width: 165,
        platforms: 9,
        enemies: 2,
        spikes: 1,
        gapMax: 3,
        gapChance: 0.25
      },
      {
        name: "Ember Volcano",
        story:
          "Fire spirits test your courage! Jump over the spark traps and keep moving toward the Golden Mask clue.",
        width: 180,
        platforms: 10,
        enemies: 2,
        spikes: 2,
        gapMax: 3,
        gapChance: 0.27
      },
      {
        name: "Tide Isles",
        story:
          "The water mask lies beyond the bright blue tides. Leap carefully, young ninja. Splash would be proud!",
        width: 195,
        platforms: 11,
        enemies: 3,
        spikes: 2,
        gapMax: 3,
        gapChance: 0.30
      },
      {
        name: "Storm Peaks",
        story:
          "Thunder drums echo across the peaks. The Shadow King knows you are coming. Show him your ninja spirit!",
        width: 210,
        platforms: 12,
        enemies: 3,
        spikes: 3,
        gapMax: 3,
        gapChance: 0.32
      },
      {
        name: "Shadow Woods",
        story:
          "The woods are dark, but your brick-ninja light shines like a golden star. Collect the orbs and open the portal!",
        width: 225,
        platforms: 13,
        enemies: 4,
        spikes: 3,
        gapMax: 3,
        gapChance: 0.34
      },
      {
        name: "Frozen Pass",
        story:
          "Ice spirits cheer you on. Slide, jump, and keep your eyes on the stars. The Golden Masks are closer now.",
        width: 240,
        platforms: 14,
        enemies: 4,
        spikes: 4,
        gapMax: 3,
        gapChance: 0.36
      },
      {
        name: "Sky Temple",
        story:
          "At the Sky Temple, the monks hide the last clues. Show them your bravery, kindness, and best jumps.",
        width: 255,
        platforms: 15,
        enemies: 5,
        spikes: 4,
        gapMax: 3,
        gapChance: 0.38
      },
      {
        name: "Shadow Fortress",
        story:
          "The Shadow Fortress is guarded by the Shadow King's best sentries. Stay calm, jump well, and shine bright.",
        width: 280,
        platforms: 17,
        enemies: 6,
        spikes: 5,
        gapMax: 3,
        gapChance: 0.40
      },
      {
        name: "Golden Mask Vault",
        story:
          "This is it! Recover the Golden Masks and bring light back to the Brick Realm. Master Ember believes in you!",
        width: 320,
        platforms: 20,
        enemies: 7,
        spikes: 6,
        gapMax: 3,
        gapChance: 0.42
      }
    ];

    const THEMES = [
      { sky1: "#8ce8ff", sky2: "#f6ffff", hill: "#59d95e", grass: "#5cd65c", block: "#8b5a2b", brick: "#ff9f1c", accent: "#ff4d4d", enemy: "#8e44ff" },
      { sky1: "#a7ffd4", sky2: "#ffffff", hill: "#3ecf6a", grass: "#45d965", block: "#7a9b3e", brick: "#ffd23c", accent: "#29a3ff", enemy: "#7b3fa0" },
      { sky1: "#9fd8ff", sky2: "#ffffff", hill: "#6fbaff", grass: "#69db70", block: "#cfe6ff", brick: "#29a3ff", accent: "#ffd23c", enemy: "#8e44ff" },
      { sky1: "#d9bfff", sky2: "#f9f2ff", hill: "#a979ff", grass: "#c39cff", block: "#7a5bd6", brick: "#ff6bd6", accent: "#00e5ff", enemy: "#5b2a86" },
      { sky1: "#ffb86b", sky2: "#fff1d6", hill: "#ff6b3d", grass: "#ff8c42", block: "#c0392b", brick: "#ffd23c", accent: "#ff3b30", enemy: "#7b2ff7" },
      { sky1: "#8ff5ff", sky2: "#f1ffff", hill: "#22c1c3", grass: "#2fd4a8", block: "#188f9a", brick: "#ffd23c", accent: "#00a2ff", enemy: "#8e44ff" },
      { sky1: "#a9c6ff", sky2: "#f1f5ff", hill: "#6b85ff", grass: "#7ea3ff", block: "#4a5f9e", brick: "#29a3ff", accent: "#ffd23c", enemy: "#5b2a86" },
      { sky1: "#b79cff", sky2: "#efe4ff", hill: "#7a4fd6", grass: "#9c6bff", block: "#4a2c86", brick: "#ff6bd6", accent: "#2ed573", enemy: "#20222b" },
      { sky1: "#d6f4ff", sky2: "#ffffff", hill: "#a8e6ff", grass: "#c9f2ff", block: "#7fb8d9", brick: "#00d2ff", accent: "#ffd23c", enemy: "#8e44ff" },
      { sky1: "#ffe9a3", sky2: "#fffbea", hill: "#ffc93c", grass: "#ffd86b", block: "#e0a02a", brick: "#ff9f1c", accent: "#ff3b30", enemy: "#8e44ff" },
      { sky1: "#cfd8e6", sky2: "#f5f7fa", hill: "#7a869a", grass: "#8d99ae", block: "#4c5566", brick: "#ff4d4d", accent: "#ffd23c", enemy: "#20222b" },
      { sky1: "#ffd97a", sky2: "#fff8e0", hill: "#ffb703", grass: "#ffd23c", block: "#e08e00", brick: "#ff3b30", accent: "#00d2ff", enemy: "#8e44ff" }
    ];

    const PRAISE = [
      "Brilliant!",
      "Super Brick-Jump!",
      "Masterful!",
      "You are blazing!",
      "Golden mask power!",
      "Whoosh! Level clear!",
      "Amazing teamwork!",
      "Shadow King is worried!"
    ];

    const FAILS = [
      "Brick heroes never give up!",
      "Take a breath and try again!",
      "You are closer than last time!",
      "Leap bravely, little ninja!"
    ];

    const CONFETTI_COLORS = [
      "#ff3b30",
      "#ffd23c",
      "#29a3ff",
      "#3ddc63",
      "#ff6bd6",
      "#ffffff",
      "#ff9f1c"
    ];

    const SAVE_KEY = "brick-ninja-save-v1";

    let gameState = "title";
    let selectedChar = 0;
    let unlocked = 0;
    let currentLevel = 0;

    let level = null;
    let player = null;

    let cameraX = 0;
    let cameraY = 0;
    let particles = [];
    let goalHintCooldown = 0;
    let toastTimeout = null;

    const input = {
      left: false,
      right: false,
      jump: false
    };

    let jumpQueued = false;
    const isTouchDevice = (navigator.maxTouchPoints > 0 || window.matchMedia("(any-pointer: coarse)").matches);

    function saveProgress() {
      try {
        ArcadeProfile.storage.setItem(
          SAVE_KEY,
          JSON.stringify({ unlocked, selectedChar })
        );
      } catch (e) {}
    }

    function loadProgress() {
      try {
        const data = JSON.parse(ArcadeProfile.storage.getItem(SAVE_KEY));
        if (data) {
          unlocked = Math.max(0, Math.min(Number(data.unlocked) || 0, LEVELS.length));
          selectedChar = Math.max(
            0,
            Math.min(Number(data.selectedChar) || 0, CHARACTERS.length - 1)
          );
        }
      } catch (e) {}
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function randomPraise() {
      return PRAISE[Math.floor(Math.random() * PRAISE.length)];
    }

    function randomFail() {
      return FAILS[Math.floor(Math.random() * FAILS.length)];
    }

    function setGameUIVisible(play) {
      $("touch-pause").classList.toggle("hidden", !play || !isTouchDevice);
      $("hud").classList.toggle("hidden", !play);
      $("touch-controls").classList.toggle("hidden", !play || !isTouchDevice);
    }

    function showScreen(id) {
      document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
      if (id) $(id).classList.remove("hidden");
      setGameUIVisible(id === null && gameState === "play");
    }

    function toast(message) {
      const t = $("toast");
      t.textContent = message;
      t.classList.remove("hidden");
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => t.classList.add("hidden"), 1900);
    }

    function hexToRgb(hex) {
      hex = String(hex).replace("#", "");
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      }
      const n = parseInt(hex, 16) || 0;
      return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255
      };
    }

    function colorToRgb(color) {
      if (String(color).startsWith("#")) {
        return hexToRgb(color);
      }

      const m = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) {
        return {
          r: Number(m[1]),
          g: Number(m[2]),
          b: Number(m[3])
        };
      }

      return { r: 255, g: 255, b: 255 };
    }

    function shade(color, amt) {
      const c = colorToRgb(color);
      const f = (v) =>
        amt >= 0 ? Math.round(v + (255 - v) * amt) : Math.round(v * (1 + amt));
      return `rgb(${f(c.r)},${f(c.g)},${f(c.b)})`;
    }

    function roundRectPath(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function softGlow(x, y, r, rgb, alpha = 0.35) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${alpha})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function drawStud(x, y, r, color) {
      ctx.save();

      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.arc(x, y + r * 0.35, r, 0, PI * 2);
      ctx.fill();

      const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(0, shade(color, 0.35));
      g.addColorStop(1, shade(color, -0.15));

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(20,24,40,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.28, 0, PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawBrick(x, y, w, h, color, studs = 1, radius = 8, studRadius = 6) {
      ctx.save();

      ctx.fillStyle = "rgba(0,0,0,0.14)";
      roundRectPath(x + 2, y + 4, w, h, radius);
      ctx.fill();

      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, shade(color, 0.3));
      g.addColorStop(0.45, color);
      g.addColorStop(1, shade(color, -0.22));

      ctx.fillStyle = g;
      roundRectPath(x, y, w, h, radius);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRectPath(
        x + w * 0.12,
        y + h * 0.12,
        w * 0.76,
        h * 0.18,
        Math.min(radius, h * 0.18)
      );
      ctx.fill();

      if (studs > 0) {
        for (let i = 1; i <= studs; i++) {
          drawStud(
            x + (w * i) / (studs + 1),
            y + h * 0.32,
            studRadius,
            color
          );
        }
      }

      ctx.strokeStyle = "rgba(20,24,40,0.55)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      roundRectPath(x, y, w, h, radius);
      ctx.stroke();

      ctx.restore();
    }

    function drawFilledRound(
      x,
      y,
      w,
      h,
      r,
      fill,
      stroke = "rgba(20,24,40,0.55)",
      lineWidth = 2.5
    ) {
      ctx.save();

      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, shade(fill, 0.25));
      g.addColorStop(1, shade(fill, -0.18));

      ctx.fillStyle = g;
      roundRectPath(x, y, w, h, r);
      ctx.fill();

      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        roundRectPath(x, y, w, h, r);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawStarShape(cx, cy, outer, inner, points = 5) {
      ctx.beginPath();

      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (PI / points) * i - PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();
    }

    function drawCloud(x, y, s, alpha = 0.9) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.globalAlpha = alpha;

      const shadowParts = [
        [0, 5, 20],
        [24, -5, 26],
        [52, 5, 22],
        [26, 15, 26]
      ];

      ctx.fillStyle = "rgba(120,170,220,0.18)";

      for (const part of shadowParts) {
        ctx.beginPath();
        ctx.arc(part[0], part[1], part[2], 0, PI * 2);
        ctx.fill();
      }

      const cloudParts = [
        [0, 0, 20],
        [24, -10, 26],
        [52, 0, 22],
        [26, 10, 26]
      ];

      ctx.fillStyle = "#ffffff";

      for (const part of cloudParts) {
        ctx.beginPath();
        ctx.arc(part[0], part[1], part[2], 0, PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(18, -18, 10, 0, PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function hillY(worldX, baseY, amp) {
      return (
        baseY +
        Math.sin(worldX * 0.006) * amp +
        Math.sin(worldX * 0.017) * 18 +
        Math.cos(worldX * 0.002) * 12
      );
    }

    function drawTree(x, y, s, baseColor) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);

      const trunk = shade(baseColor, -0.35);
      const leaf = shade(baseColor, 0.15);

      drawFilledRound(-6, -26, 12, 28, 4, trunk);

      const g = ctx.createLinearGradient(0, -58, 0, -26);
      g.addColorStop(0, shade(leaf, 0.3));
      g.addColorStop(1, leaf);

      ctx.fillStyle = g;

      ctx.beginPath();
      ctx.arc(-13, -36, 13, 0, PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, -48, 15, 0, PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(13, -36, 13, 0, PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.arc(-4, -46, 5, 0, PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawHillLayer(parallax, baseY, color, alpha, amp, trees = false) {
      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_H);

      for (let x = 0; x <= VIEW_W; x += 16) {
        const wx = x + cameraX * parallax;
        ctx.lineTo(x, hillY(wx, baseY, amp));
      }

      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = shade(color, 0.35);
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.beginPath();

      for (let x = 0; x <= VIEW_W; x += 16) {
        const wx = x + cameraX * parallax;
        const y = hillY(wx, baseY, amp);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();

      if (trees) {
        for (let i = 0; i < 5; i++) {
          const span = VIEW_W + 320;
          const sx =
            ((((i * 280 - cameraX * parallax) % span) + span) % span) - 160;

          const wx = sx + cameraX * parallax;
          const y = hillY(wx, baseY, amp);

          drawTree(
            sx,
            y,
            0.85 + ((i * 17) % 3) * 0.15,
            color
          );
        }
      }

      ctx.restore();
    }

    function drawSun(x, y, now) {
      softGlow(x, y, 120, "255,240,150", 0.5);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(now * 0.15);

      ctx.fillStyle = "#ffd23c";
      ctx.strokeStyle = "rgba(20,24,40,0.25)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";

      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i * PI) / 4);
        roundRectPath(-6, -72, 12, 22, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.rotate(-now * 0.15);

      const g = ctx.createRadialGradient(-8, -8, 6, 0, 0, 38);
      g.addColorStop(0, "#fff6c2");
      g.addColorStop(1, "#ffd23c");

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#a86a00";
      ctx.beginPath();
      ctx.arc(-10, -4, 4, 0, PI * 2);
      ctx.arc(10, -4, 4, 0, PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#a86a00";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 6, 10, 0.2 * PI, 0.8 * PI);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(-12, -12, 8, 0, PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawBackground() {
      const theme = THEMES[currentLevel % THEMES.length];
      const now = performance.now() / 1000;

      const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      grad.addColorStop(0, theme.sky1);
      grad.addColorStop(1, theme.sky2);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      drawSun(VIEW_W * 0.82 - cameraX * 0.02, 92, now);

      for (let i = 0; i < 6; i++) {
        const span = VIEW_W + 420;
        const cloudX =
          ((((i * 280 + now * 18 - cameraX * 0.12) % span) + span) % span) -
          210;

        const cloudY = 50 + ((i * 53) % 110);
        drawCloud(cloudX, cloudY, 0.75 + (i % 3) * 0.22, 0.92);
      }

      drawHillLayer(0.16, 285, theme.hill, 0.32, 65, false);
      drawHillLayer(0.28, 335, theme.hill, 0.55, 85, true);
      drawHillLayer(0.42, 390, theme.hill, 0.85, 70, true);

      const bottomGlow = ctx.createLinearGradient(0, VIEW_H - 120, 0, VIEW_H);
      bottomGlow.addColorStop(0, "rgba(255,255,255,0)");
      bottomGlow.addColorStop(1, "rgba(255,255,255,0.10)");
      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, VIEW_H - 120, VIEW_W, 120);
    }

    function drawTiles(theme) {
      const startX = Math.max(0, Math.floor(cameraX / TILE));
      const endX = Math.min(level.width - 1, Math.ceil((cameraX + VIEW_W) / TILE));
      const startY = Math.max(0, Math.floor(cameraY / TILE));
      const endY = Math.min(
        level.height - 1,
        Math.ceil((cameraY + VIEW_H) / TILE)
      );

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const ch = level.grid[y][x];
          const sx = x * TILE;
          const sy = y * TILE;

          if (ch === "#") {
            const exposed = !isSolid(tileAt(x, y - 1));
            const color = exposed ? theme.grass : theme.block;

            drawBrick(sx + 2, sy + 2, TILE - 4, TILE - 4, color, exposed ? 2 : 0, 9, 6);

            if (exposed) {
              ctx.fillStyle = "rgba(255,255,255,0.18)";
              roundRectPath(sx + 6, sy + 5, TILE - 12, 8, 4);
              ctx.fill();
            }
          } else if (ch === "=") {
            drawBrick(sx + 2, sy + 2, TILE - 4, 20, theme.brick, 2, 8, 5);
          } else if (ch === "^") {
            drawBrick(sx + 3, sy + TILE - 8, TILE - 6, 8, "#9aa6b5", 0, 4);

            for (let i = 0; i < 3; i++) {
              const px = sx + i * 13;

              const g = ctx.createLinearGradient(0, sy + 8, 0, sy + TILE);
              g.addColorStop(0, "#ffffff");
              g.addColorStop(0.35, "#cfd8e3");
              g.addColorStop(1, "#8592a3");

              ctx.fillStyle = g;

              ctx.beginPath();
              ctx.moveTo(px + 1, sy + TILE);
              ctx.lineTo(px + 6.5, sy + 10);
              ctx.lineTo(px + 12, sy + TILE);
              ctx.closePath();
              ctx.fill();

              ctx.strokeStyle = "rgba(20,24,40,0.45)";
              ctx.lineWidth = 2.5;
              ctx.lineJoin = "round";
              ctx.stroke();

              ctx.fillStyle = "rgba(255,255,255,0.45)";
              ctx.beginPath();
              ctx.moveTo(px + 4, sy + TILE - 4);
              ctx.lineTo(px + 6.5, sy + 15);
              ctx.lineTo(px + 7.5, sy + TILE - 4);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }

    function drawGoal() {
      if (!level || !level.goal) return;

      const g = level.goal;
      const active = level.starsGot >= level.starsTotal;
      const now = performance.now() / 1000;

      const cx = g.x + g.w / 2;
      const cy = g.y + g.h / 2;
      const pulse = Math.sin(now * 3) * 5;
      const rgb = active ? "255,215,0" : "175,185,225";

      ctx.save();
      ctx.translate(cx, cy);

      softGlow(0, 0, active ? 95 + pulse : 55, rgb, active ? 0.34 : 0.16);

      drawBrick(-g.w / 2, -g.h / 2, g.w, g.h, active ? "#ffd23c" : "#9aa3b8", 0, 22);

      const innerW = g.w - 18;
      const innerH = g.h - 18;

      const grad = ctx.createLinearGradient(0, -innerH / 2, 0, innerH / 2);

      if (active) {
        grad.addColorStop(0, "#fffbe6");
        grad.addColorStop(0.4, "#ffd23c");
        grad.addColorStop(1, "#ff9d00");
      } else {
        grad.addColorStop(0, "#e8ecf5");
        grad.addColorStop(1, "#9aa3b8");
      }

      ctx.fillStyle = grad;
      roundRectPath(-innerW / 2, -innerH / 2, innerW, innerH, 16);
      ctx.fill();

      ctx.strokeStyle = "rgba(20,24,40,0.45)";
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.strokeStyle = active
          ? "rgba(255,255,190,0.72)"
          : "rgba(230,235,255,0.34)";
        ctx.lineWidth = 3;
        ctx.arc(
          0,
          0,
          8 + i * 8,
          now * (0.8 + i * 0.18) + i,
          now * (0.8 + i * 0.18) + i + 2
        );
        ctx.stroke();
      }

      if (active) {
        for (let i = 0; i < 3; i++) {
          const a = now * 2.1 + i * ((PI * 2) / 3);
          const ox = Math.cos(a) * (g.w / 2 + 12);
          const oy = Math.sin(a) * (g.h / 2 + 12);

          ctx.fillStyle = "rgba(255,240,160,0.95)";
          ctx.beginPath();
          ctx.arc(ox, oy, 4, 0, PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    function drawEntities() {
      const now = performance.now() / 1000;
      const theme = THEMES[currentLevel % THEMES.length];

      for (const e of level.entities) {
        if (e.type === "star") {
          const bob = Math.sin(now * 3 + (e.bob || 0)) * 4;

          ctx.save();
          ctx.translate(e.x + e.w / 2, e.y + e.h / 2 + bob);

          const pulse = 1 + Math.sin(now * 4 + (e.bob || 0)) * 0.08;
          ctx.rotate(Math.sin(now * 2 + (e.bob || 0)) * 0.12);
          ctx.scale(pulse, pulse);

          softGlow(0, 0, 34, "255,220,80", 0.3);

          const grad = ctx.createLinearGradient(0, -18, 0, 18);
          grad.addColorStop(0, "#fff6c2");
          grad.addColorStop(0.45, "#ffd23c");
          grad.addColorStop(1, "#ff9d00");

          ctx.fillStyle = grad;
          drawStarShape(0, 0, 18, 8);
          ctx.fill();

          ctx.strokeStyle = "rgba(20,24,40,0.5)";
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          ctx.stroke();

          ctx.fillStyle = "rgba(255,255,255,0.55)";
          drawStarShape(-2, -3, 7, 3);
          ctx.fill();

          drawStud(0, 0, 5, "#ffd23c");

          ctx.restore();
        } else if (e.type === "enemy") {
          const wobble = Math.sin(now * 6 + e.x * 0.05) * 2;
          const bodyColor = theme.enemy || "#8e44ff";

          ctx.save();

          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath();
          ctx.ellipse(
            e.x + e.w / 2,
            e.y + e.h + 3,
            e.w * 0.52,
            6,
            0,
            0,
            PI * 2
          );
          ctx.fill();

          drawBrick(e.x, e.y + 6, e.w, e.h - 6, bodyColor, 1, 8, 5);

          ctx.fillStyle = "rgba(255,255,255,0.92)";
          roundRectPath(e.x + 6, e.y + 14, e.w - 12, 11, 5);
          ctx.fill();

          ctx.strokeStyle = "rgba(20,24,40,0.4)";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#20222b";
          ctx.beginPath();
          ctx.arc(
            e.x + 11 + (e.dir || 1) * 1.5,
            e.y + 19 + wobble * 0.2,
            2.4,
            0,
            PI * 2
          );
          ctx.arc(
            e.x + e.w - 11 + (e.dir || 1) * 1.5,
            e.y + 19 + wobble * 0.2,
            2.4,
            0,
            PI * 2
          );
          ctx.fill();

          ctx.strokeStyle = bodyColor;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";

          ctx.beginPath();
          ctx.moveTo(e.x + 6, e.y + 12);
          ctx.lineTo(e.x + 13, e.y + 15);
          ctx.moveTo(e.x + e.w - 6, e.y + 12);
          ctx.lineTo(e.x + e.w - 13, e.y + 15);
          ctx.stroke();

          ctx.fillStyle = "#20222b";
          ctx.beginPath();
          ctx.ellipse(e.x + 8, e.y + e.h + 1, 5, 3, 0, 0, PI * 2);
          ctx.ellipse(e.x + e.w - 8, e.y + e.h + 1, 5, 3, 0, 0, PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }
    }

    function drawPlayer() {
      if (!player) return;

      if (player.invuln > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
        return;
      }

      const char = CHARACTERS[selectedChar];
      const now = performance.now() / 1000;

      const moving = Math.abs(player.vx) > 25;
      const facing = player.vx < -5 ? -1 : 1;
      const bounce = moving && player.onGround ? Math.sin(now * 16) * 2 : 0;
      const lean = clamp(player.vx / 22, -10, 10);

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.20)";
      ctx.beginPath();
      ctx.ellipse(
        player.x + player.w / 2,
        player.y + player.h + 4,
        player.w * 0.62,
        7,
        0,
        0,
        PI * 2
      );
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(player.x + player.w / 2, player.y + player.h - bounce);
      ctx.rotate((lean * PI) / 180);
      ctx.scale(facing, 1);

      drawFilledRound(-11, -11, 8, 11, 3, "#2a2f45");
      drawFilledRound(3, -11, 8, 11, 3, "#2a2f45");

      drawFilledRound(-13, -27, 26, 18, 7, char.color);
      drawFilledRound(-13, -15, 26, 6, 3, "#20222b");
      drawFilledRound(-3, -15, 6, 6, 2, "#ffd23c");

      drawFilledRound(-17, -25, 7, 14, 4, char.color);
      drawFilledRound(10, -25, 7, 14, 4, char.color);

      ctx.fillStyle = "#ffd9b8";
      ctx.strokeStyle = "rgba(20,24,40,0.45)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(-13.5, -12, 3.5, 0, PI * 2);
      ctx.arc(13.5, -12, 3.5, 0, PI * 2);
      ctx.fill();
      ctx.stroke();

      const hg = ctx.createLinearGradient(0, -42, 0, -22);
      hg.addColorStop(0, shade(char.color, 0.28));
      hg.addColorStop(1, shade(char.color, -0.16));

      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(0, -31.5, 10, 0, PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(20,24,40,0.55)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      drawFilledRound(-6.5, -36.5, 14, 8, 4, "#ffe0bd", "rgba(20,24,40,0.45)", 2);

      ctx.fillStyle = "#20222b";
      ctx.beginPath();
      ctx.arc(1, -32.5, 2, 0, PI * 2);
      ctx.arc(6, -32.5, 2, 0, PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(20,24,40,0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(3.5, -30.5, 2.5, 0.15 * PI, 0.85 * PI);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,120,120,0.25)";
      ctx.beginPath();
      ctx.arc(-1, -29.5, 1.8, 0, PI * 2);
      ctx.arc(8, -29.5, 1.8, 0, PI * 2);
      ctx.fill();

      ctx.strokeStyle = char.color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(-9, -37);
      ctx.quadraticCurveTo(
        -18,
        -35 + Math.sin(now * 10) * 4,
        -24,
        -28 + Math.sin(now * 8) * 6
      );
      ctx.stroke();

      ctx.strokeStyle = "rgba(20,24,40,0.35)";
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(-9, -37);
      ctx.quadraticCurveTo(
        -18,
        -35 + Math.sin(now * 10) * 4,
        -24,
        -28 + Math.sin(now * 8) * 6
      );
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRectPath(-9, -25, 8, 4, 2);
      ctx.fill();

      ctx.restore();
    }

    function drawParticles() {
      for (const p of particles) {
        ctx.save();

        ctx.globalAlpha = Math.max(
          0,
          Math.min(1, p.life / (p.maxLife || 1))
        );

        if (p.screen) {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot || 0);

          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;

          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);

          ctx.strokeStyle = "rgba(20,24,40,0.18)";
          ctx.lineWidth = 1;
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;

          ctx.beginPath();
          ctx.arc(p.x - cameraX, p.y - cameraY, p.size, 0, PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function drawWorld() {
      const theme = THEMES[currentLevel % THEMES.length];

      ctx.save();
      ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

      drawTiles(theme);
      drawGoal();
      drawEntities();
      drawPlayer();

      ctx.restore();
    }

    function draw() {
      drawBackground();

      if (
        level &&
        player &&
        (gameState === "play" ||
          gameState === "complete" ||
          gameState === "fail" ||
          gameState === "intro")
      ) {
        drawWorld();
      }

      drawParticles();
    }

    function buildCharacterSelect() {
      const wrap = $("characters");
      wrap.innerHTML = "";

      CHARACTERS.forEach((c, i) => {
        const div = document.createElement("div");
        div.className = "character" + (i === selectedChar ? " selected" : "");

        div.innerHTML = `
          <div class="mini-ninja" style="--c:${c.color}"></div>
          <div><strong>${c.name}</strong></div>
          <small>${c.desc}</small>
        `;

        div.onclick = () => {
          selectedChar = i;
          ensureAudio();
          buildCharacterSelect();
          saveProgress();
        };

        wrap.appendChild(div);
      });
    }

    function buildLevelSelect() {
      const wrap = $("level-buttons");
      wrap.innerHTML = "";

      LEVELS.forEach((lv, i) => {
        const b = document.createElement("button");
        b.disabled = i > unlocked;
        b.title = lv.name;
        b.textContent = i > unlocked ? "🔒" : String(i + 1);

        b.onclick = () => {
          currentLevel = i;
          showLevelIntro();
        };

        wrap.appendChild(b);
      });
    }

    function showStory() {
      $("story-text").textContent =
        "The Golden Masks that protect the Brick Realm have been hidden by the mischievous Shadow King. Master Ember has chosen five young brick ninja: Blaze, Splash, Bolt, Stone, and Zephyr. Travel through 12 bright magical lands, collect Star Bricks, open portals, and bring the Golden Masks home!";

      showScreen("story-screen");
    }

    function showLevelIntro() {
      gameState = "intro";
      $("level-intro-title").textContent = `Level ${currentLevel + 1}: ${
        LEVELS[currentLevel].name
      }`;
      $("level-intro-text").textContent = LEVELS[currentLevel].story;
      showScreen("level-intro-screen");
    }

    function startLevel() {
      loadLevel(currentLevel);
      gameState = "play";
      showScreen(null);
      setGameUIVisible(true);
      toast(`Level ${currentLevel + 1}: ${LEVELS[currentLevel].name}`);
    }

    function completeLevel() {
      if (gameState !== "play") return;

      gameState = "complete";
      unlocked = Math.max(unlocked, currentLevel + 1);
      saveProgress();

      soundComplete();
      spawnConfetti(180);

      $("complete-title").textContent = randomPraise();
      $("complete-text").textContent = `You collected ${level.starsGot}/${level.starsTotal} Star Bricks and opened the Golden Portal!`;
      $("complete-stars").textContent =
        "⭐".repeat(level.starsGot) +
        "☆".repeat(Math.max(0, level.starsTotal - level.starsGot));

      $("btn-next").textContent =
        currentLevel >= LEVELS.length - 1 ? "Finish Quest" : "Next Level";

      showScreen("complete-screen");
    }

    function failLevel() {
      if (gameState !== "play") return;

      gameState = "fail";
      $("fail-text").textContent = randomFail();
      showScreen("fail-screen");
    }

    function showFinal() {
      gameState = "final";
      $("final-text").textContent =
        "The Golden Masks shine brightly again! The Shadow King shrinks into a tiny grumpy cloud and floats away. Master Ember bows and says: 'You are true brick ninja heroes. Thank you for saving the Brick Realm!'";

      spawnConfetti(240);
      soundComplete();
      showScreen("final-screen");
    }

    $("btn-new").onclick = () => {
      ensureAudio();
      unlocked = 0;
      currentLevel = 0;
      saveProgress();
      buildCharacterSelect();
      showScreen("select-screen");
    };

    $("btn-continue").onclick = () => {
      ensureAudio();
      buildLevelSelect();
      showScreen("level-screen");
    };

    $("btn-select-back").onclick = () => showScreen("title-screen");

    $("btn-begin-story").onclick = () => {
      ensureAudio();
      saveProgress();
      showStory();
    };

    $("btn-story-begin").onclick = () => {
      currentLevel = 0;
      showLevelIntro();
    };

    $("btn-level-back").onclick = () => showScreen("title-screen");

    $("btn-level-play").onclick = () => {
      ensureAudio();
      startLevel();
    };

    $("btn-replay").onclick = () => {
      startLevel();
    };

    $("btn-next").onclick = () => {
      if (currentLevel >= LEVELS.length - 1) {
        showFinal();
      } else {
        currentLevel++;
        showLevelIntro();
      }
    };

    $("btn-complete-levels").onclick = () => {
      buildLevelSelect();
      showScreen("level-screen");
    };

    $("btn-fail-retry").onclick = () => {
      startLevel();
    };

    $("btn-fail-levels").onclick = () => {
      buildLevelSelect();
      showScreen("level-screen");
    };

    $("btn-final-restart").onclick = () => {
      unlocked = 0;
      currentLevel = 0;
      saveProgress();
      buildCharacterSelect();
      showScreen("select-screen");
    };

    let audioCtx = null;

    function ensureAudio() {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    }

    function beep(freq, dur, type = "square", vol = 0.05, slide = 0) {
      if (!audioCtx) return;

      try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();

        o.type = type;
        o.frequency.setValueAtTime(freq, audioCtx.currentTime);

        if (slide) {
          o.frequency.linearRampToValueAtTime(
            freq + slide,
            audioCtx.currentTime + dur
          );
        }

        g.gain.setValueAtTime(vol, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);

        o.connect(g);
        g.connect(audioCtx.destination);

        o.start();
        o.stop(audioCtx.currentTime + dur);
      } catch (e) {}
    }

    const soundJump = () => beep(320, 0.09, "square", 0.03, 180);
    const soundStar = () => beep(880, 0.13, "triangle", 0.06, 240);
    const soundHurt = () => beep(130, 0.22, "sawtooth", 0.07, -50);
    const soundGoalHint = () => beep(180, 0.16, "square", 0.04, -30);

    function soundComplete() {
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => beep(f, 0.16, "triangle", 0.07), i * 110);
      });
    }

    function bindTouch(id, down, up) {
      const el = $(id);
      if (!el) return;

      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        ensureAudio();
        down();
      });

      const held = new Set();
      el.addEventListener("pointerdown", e => { held.add(e.pointerId); el.setPointerCapture(e.pointerId); });
      const end = (e) => {
        held.delete(e.pointerId);
        if (!held.size && up) up();
      };
      window.addEventListener("blur", () => { held.clear(); if (up) up(); });
      document.addEventListener("visibilitychange", () => { if (document.hidden) { held.clear(); if (up) up(); } });

      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("lostpointercapture", end);
    }

    bindTouch(
      "touch-left",
      () => (input.left = true),
      () => (input.left = false)
    );

    bindTouch(
      "touch-right",
      () => (input.right = true),
      () => (input.right = false)
    );

    bindTouch(
      "touch-jump",
      () => {
        if (gameState === "play") jumpQueued = true;
        input.jump = true;
      },
      () => (input.jump = false)
    );

    window.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }

      ensureAudio();

      if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;

      if (e.code === "Space" || e.code === "Enter") {
        if (!input.jump && gameState === "play") jumpQueued = true;
        input.jump = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
      if (e.code === "Space" || e.code === "Enter") {
        input.jump = false;
      }
    });

    function mulberry32(a) {
      return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function generateLevel(levelIndex) {
      const cfg = LEVELS[levelIndex];
      const W = cfg.width;
      const H = 14;
      const groundY = 11;

      const rng = mulberry32(2026 + levelIndex * 777);
      const grid = Array.from({ length: H }, () => Array(W).fill(" "));

      const fillGround = (x0, x1) => {
        for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
          for (let y = groundY; y < H; y++) {
            grid[y][x] = "#";
          }
        }
      };

      fillGround(0, W - 1);

      let x = 8;

      while (x < W - 10) {
        if (rng() < cfg.gapChance) {
          const gap = 1 + Math.floor(rng() * cfg.gapMax);

          for (let g = 0; g < gap; g++) {
            const gx = x + g;

            if (gx >= 8 && gx < W - 8) {
              for (let y = groundY; y < H; y++) {
                grid[y][gx] = " ";
              }
            }
          }

          x += gap + 4 + Math.floor(rng() * 4);
        } else {
          x += 5 + Math.floor(rng() * 5);
        }
      }

      fillGround(0, 7);
      fillGround(W - 8, W - 1);

      const platforms = [];

      for (let i = 0; i < cfg.platforms; i++) {
        const pw = 3 + Math.floor(rng() * 3);
        const px = 10 + Math.floor(rng() * (W - 22 - pw));
        const py = groundY - (2 + Math.floor(rng() * 2));

        for (let xx = px; xx < px + pw; xx++) {
          grid[py][xx] = "=";
        }

        platforms.push({ x: px, y: py, w: pw });
      }

      let starsPlaced = 0;

      function shuffle(arr) {
        const a = arr.slice();

        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }

        return a;
      }

      function placeStarAt(sx, sy) {
        if (sx > 5 && sx < W - 5 && grid[sy] && grid[sy][sx] === " ") {
          grid[sy][sx] = "S";
          starsPlaced++;
          return true;
        }

        return false;
      }

      function placeStarInZone(zoneStart, zoneEnd) {
        zoneStart = Math.max(10, Math.floor(zoneStart));
        zoneEnd = Math.min(W - 10, Math.floor(zoneEnd));

        if (zoneEnd <= zoneStart) return false;

        const zonePlatforms = shuffle(
          platforms.filter((p) => p.x >= zoneStart && p.x + p.w <= zoneEnd)
        );

        for (const p of zonePlatforms) {
          const sx = p.x + Math.floor(p.w / 2);
          const sy = p.y - 1;

          if (placeStarAt(sx, sy)) {
            return true;
          }
        }

        for (let tries = 0; tries < 180; tries++) {
          const sx = zoneStart + Math.floor(rng() * (zoneEnd - zoneStart));
          const sy = groundY - 1;

          if (grid[sy][sx] === " " && grid[groundY][sx] === "#") {
            if (placeStarAt(sx, sy)) {
              return true;
            }
          }
        }

        for (let sx = zoneStart; sx <= zoneEnd; sx++) {
          const sy = groundY - 1;

          if (grid[sy][sx] === " " && grid[groundY][sx] === "#") {
            if (placeStarAt(sx, sy)) {
              return true;
            }
          }
        }

        return false;
      }

      const starZones = [
        [12, W * 0.30],
        [W * 0.36, W * 0.64],
        [W * 0.70, W - 12]
      ];

      for (const zone of starZones) {
        if (starsPlaced >= 3) break;
        placeStarInZone(zone[0], zone[1]);
      }

      let fallbackTries = 0;

      while (starsPlaced < 3 && fallbackTries++ < 600) {
        const sx = 10 + Math.floor(rng() * (W - 20));
        const sy = groundY - 1;

        if (grid[sy][sx] === " " && grid[groundY][sx] === "#") {
          grid[sy][sx] = "S";
          starsPlaced++;
        }
      }

      for (let i = 0; i < cfg.enemies; i++) {
        let tries = 0;

        while (tries++ < 100) {
          const ex = 12 + Math.floor(rng() * (W - 26));
          const ey = groundY - 1;

          if (
            grid[ey][ex] === " " &&
            grid[groundY][ex] === "#" &&
            grid[groundY][ex - 1] === "#" &&
            grid[groundY][ex + 1] === "#"
          ) {
            grid[ey][ex] = "E";
            break;
          }
        }
      }

      for (let i = 0; i < cfg.spikes; i++) {
        let tries = 0;

        while (tries++ < 100) {
          const sx = 14 + Math.floor(rng() * (W - 28));
          const sy = groundY - 1;

          if (
            grid[sy][sx] === " " &&
            grid[groundY][sx] === "#" &&
            grid[groundY][sx - 1] === "#" &&
            grid[groundY][sx + 1] === "#"
          ) {
            grid[sy][sx] = "^";
            break;
          }
        }
      }

      grid[groundY - 1][2] = "P";
      grid[groundY - 1][W - 4] = "G";

      return grid.map((row) => row.join(""));
    }

    function loadLevel(index) {
      const map = generateLevel(index);
      const maxW = Math.max(...map.map((r) => r.length));
      const rows = map.map((r) => r.padEnd(maxW, " "));

      level = {
        index,
        name: LEVELS[index].name,
        grid: [],
        entities: [],
        width: maxW,
        height: rows.length,
        starsTotal: 0,
        starsGot: 0,
        startX: 80,
        startY: 80,
        checkpointX: 80,
        checkpointY: 80,
        goal: null
      };

      const playerW = 28;
      const playerH = 36;

      for (let y = 0; y < rows.length; y++) {
        const row = [];

        for (let x = 0; x < maxW; x++) {
          let ch = rows[y][x] || " ";

          if (ch === "P") {
            level.startX = x * TILE + 6;
            level.startY = y * TILE + TILE - playerH;
            ch = " ";
          } else if (ch === "S") {
            level.starsTotal++;
            level.entities.push({
              type: "star",
              x: x * TILE + 5,
              y: y * TILE + 5,
              w: 30,
              h: 30,
              bob: Math.random() * PI * 2
            });
            ch = " ";
          } else if (ch === "E") {
            level.entities.push({
              type: "enemy",
              x: x * TILE + 4,
              y: y * TILE + 8,
              w: 32,
              h: 32,
              dir: x % 2 === 0 ? 1 : -1,
              speed: 68 + index * 4
            });
            ch = " ";
          } else if (ch === "G") {
            level.goal = {
              x: x * TILE - 8,
              y: y * TILE - 35,
              w: TILE + 16,
              h: TILE + 35
            };
            ch = " ";
          }

          row.push(ch);
        }

        level.grid.push(row);
      }

      if (level.starsTotal < 3) {
        for (let sx = 10; sx < level.width - 10 && level.starsTotal < 3; sx++) {
          const sy = 10;

          if (
            level.grid[sy] &&
            level.grid[sy][sx] === " " &&
            level.grid[sy + 1] &&
            level.grid[sy + 1][sx] === "#"
          ) {
            level.entities.push({
              type: "star",
              x: sx * TILE + 5,
              y: sy * TILE + 5,
              w: 30,
              h: 30,
              bob: Math.random() * PI * 2
            });

            level.starsTotal++;
          }
        }
      }

      const char = CHARACTERS[selectedChar];

      player = {
        x: level.startX,
        y: level.startY,
        w: playerW,
        h: playerH,
        vx: 0,
        vy: 0,
        onGround: false,
        jumps: 0,
        invuln: 2,
        hearts: 3 + char.extraHearts,
        maxHearts: 3 + char.extraHearts
      };

      level.checkpointX = level.startX;
      level.checkpointY = level.startY;

      particles = [];
      cameraX = 0;
      cameraY = 0;
      goalHintCooldown = 0;

      updateHUD();
    }

    function updateHUD() {
      if (!level || !player) return;

      $("hud-level").textContent = `${currentLevel + 1}/${LEVELS.length} ${level.name}`;

      let hearts = "";
      for (let i = 0; i < player.maxHearts; i++) {
        hearts += i < player.hearts ? "❤️" : "🖤";
      }

      $("hud-hearts").textContent = hearts;
      $("hud-stars").textContent = `⭐ ${level.starsGot}/${level.starsTotal}`;
    }

    function tileAt(col, row) {
      if (!level) return " ";
      if (col < 0 || col >= level.width) return "#";
      if (row < 0 || row >= level.height) return " ";
      return level.grid[row][col];
    }

    function isSolid(ch) {
      return ch === "#" || ch === "=";
    }

    function rectIntersect(a, b) {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    }

    function moveX(obj, dx) {
      if (dx === 0) return false;

      obj.x += dx;

      const top = Math.floor(obj.y / TILE);
      const bottom = Math.floor((obj.y + obj.h - 1) / TILE);

      if (dx > 0) {
        const col = Math.floor((obj.x + obj.w - 1) / TILE);

        for (let row = top; row <= bottom; row++) {
          if (isSolid(tileAt(col, row))) {
            obj.x = col * TILE - obj.w - 0.01;
            return true;
          }
        }
      } else {
        const col = Math.floor(obj.x / TILE);

        for (let row = top; row <= bottom; row++) {
          if (isSolid(tileAt(col, row))) {
            obj.x = (col + 1) * TILE + 0.01;
            return true;
          }
        }
      }

      return false;
    }

    function moveY(obj, dy) {
      if (dy === 0) return false;

      obj.y += dy;

      const left = Math.floor(obj.x / TILE);
      const right = Math.floor((obj.x + obj.w - 1) / TILE);

      if (dy > 0) {
        const row = Math.floor((obj.y + obj.h - 1) / TILE);

        for (let col = left; col <= right; col++) {
          if (isSolid(tileAt(col, row))) {
            obj.y = row * TILE - obj.h - 0.01;
            obj.vy = 0;
            return true;
          }
        }
      } else {
        const row = Math.floor(obj.y / TILE);

        for (let col = left; col <= right; col++) {
          if (isSolid(tileAt(col, row))) {
            obj.y = (row + 1) * TILE + 0.01;
            obj.vy = 0;
            return true;
          }
        }
      }

      return false;
    }

    function isOnSpikes(obj) {
      const left = Math.floor(obj.x / TILE);
      const right = Math.floor((obj.x + obj.w - 1) / TILE);
      const top = Math.floor(obj.y / TILE);
      const bottom = Math.floor((obj.y + obj.h - 1) / TILE);

      for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
          if (tileAt(col, row) === "^") return true;
        }
      }

      return false;
    }

    function spawnParticles(x, y, color, count, spread, life) {
      for (let i = 0; i < count; i++) {
        particles.push({
          screen: false,
          x,
          y,
          vx: (Math.random() - 0.5) * spread,
          vy: (Math.random() - 0.7) * spread,
          life: life * (0.7 + Math.random() * 0.6),
          maxLife: life,
          color,
          size: 2 + Math.random() * 3
        });
      }
    }

    function spawnConfetti(count) {
      for (let i = 0; i < count; i++) {
        particles.push({
          screen: true,
          x: Math.random() * VIEW_W,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 80,
          vy: 100 + Math.random() * 180,
          life: 2.2 + Math.random() * 1.6,
          maxLife: 3.5,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 5 + Math.random() * 7,
          rot: Math.random() * PI,
          vr: (Math.random() - 0.5) * 6
        });
      }
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.screen) {
          p.vy += 120 * dt;
          p.rot += (p.vr || 0) * dt;
        } else {
          p.vy += 300 * dt;
        }
      }
    }

    function attemptJump() {
      if (!player || gameState !== "play") return;

      const char = CHARACTERS[selectedChar];

      if (player.onGround || player.jumps < 2) {
        player.vy = -char.jump;
        player.jumps++;
        player.onGround = false;

        soundJump();
        spawnParticles(
          player.x + player.w / 2,
          player.y + player.h,
          "#ffffff",
          8,
          80,
          0.25
        );
      }
    }

    function hurtPlayer(knockX) {
      if (!player || player.invuln > 0 || gameState !== "play") return;

      player.hearts--;
      player.invuln = 2;
      player.vy = -330;
      player.vx = knockX;

      spawnParticles(
        player.x + player.w / 2,
        player.y + player.h / 2,
        "#ff5a5a",
        16,
        140,
        0.45
      );

      soundHurt();
      updateHUD();

      if (player.hearts <= 0) {
        failLevel();
      }
    }

    function fallDamage() {
      if (gameState !== "play") return;

      player.hearts--;
      soundHurt();
      updateHUD();

      if (player.hearts <= 0) {
        failLevel();
      } else {
        player.x = level.checkpointX === undefined ? level.startX : level.checkpointX;
        player.y = level.checkpointY === undefined ? level.startY : level.checkpointY;
        player.vx = 0;
        player.vy = 0;
        player.invuln = 2;
        player.jumps = 0;
        toast("Whoops! Back to the checkpoint!");
      }
    }

    function updateEnemy(e, dt) {
      const oldX = e.x;
      e.x += e.dir * e.speed * dt;

      const midRow = Math.floor((e.y + e.h / 2) / TILE);

      if (e.dir > 0) {
        const col = Math.floor((e.x + e.w + 2) / TILE);
        if (isSolid(tileAt(col, midRow))) {
          e.x = col * TILE - e.w - 2;
          e.dir *= -1;
        }
      } else {
        const col = Math.floor((e.x - 2) / TILE);
        if (isSolid(tileAt(col, midRow))) {
          e.x = (col + 1) * TILE + 2;
          e.dir *= -1;
        }
      }

      const footRow = Math.floor((e.y + e.h + 4) / TILE);
      const footCol =
        e.dir > 0
          ? Math.floor((e.x + e.w + 4) / TILE)
          : Math.floor((e.x - 4) / TILE);

      if (!isSolid(tileAt(footCol, footRow))) {
        e.dir *= -1;
        e.x = oldX;
      }
    }

    function updateGame(dt) {
      if (!level || !player || gameState !== "play") return;

      const char = CHARACTERS[selectedChar];

      const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const targetSpeed = move * char.speed;

      player.vx += (targetSpeed - player.vx) * Math.min(1, 18 * dt);
      if (Math.abs(player.vx) < 5) player.vx = 0;

      if (jumpQueued) {
        attemptJump();
        jumpQueued = false;
      }

      const falling = player.vy > 0;
      let gravity = 1700;

      if (char.float && falling && input.jump) {
        gravity = 700;
      }

      player.vy += gravity * dt;
      if (player.vy > 950) player.vy = 950;

      moveX(player, player.vx * dt);

      player.onGround = moveY(player, player.vy * dt);

      if (player.onGround) {
        player.jumps = 0;
      } else if (player.jumps === 0) {
        player.jumps = 1;
      }

      if (isOnSpikes(player)) {
        hurtPlayer(player.vx >= 0 ? -210 : 210);
        if (gameState !== "play") return;
      }

      for (const e of level.entities) {
        if (e.type === "enemy") updateEnemy(e, dt);
      }

      for (let i = level.entities.length - 1; i >= 0; i--) {
        const e = level.entities[i];
        if (!rectIntersect(player, e)) continue;

        if (e.type === "star") {
          level.entities.splice(i, 1);
          level.starsGot++;

          level.checkpointX = clamp(
            e.x + e.w / 2 - player.w / 2,
            0,
            level.width * TILE - player.w
          );

          level.checkpointY = e.y + e.h - player.h;

          spawnParticles(
            e.x + e.w / 2,
            e.y + e.h / 2,
            "#ffd700",
            20,
            150,
            0.55
          );

          soundStar();
          updateHUD();

          if (level.starsGot === level.starsTotal) {
            toast("Golden Portal open!");
          } else {
            toast(`Checkpoint! ${level.starsGot}/${level.starsTotal} Star Bricks`);
          }
        } else if (e.type === "enemy") {
          const knock =
            player.x + player.w / 2 < e.x + e.w / 2 ? -220 : 220;

          hurtPlayer(knock);
          if (gameState !== "play") return;
        }
      }

      if (level.goal && rectIntersect(player, level.goal)) {
        if (level.starsGot >= level.starsTotal) {
          completeLevel();
          return;
        } else if (goalHintCooldown <= 0) {
          toast("Collect all 3 Star Bricks first!");
          soundGoalHint();
          goalHintCooldown = 2;
        }
      }

      if (goalHintCooldown > 0) goalHintCooldown -= dt;
      if (player.invuln > 0) player.invuln -= dt;

      if (player.y > level.height * TILE + 200) {
        fallDamage();
        if (gameState !== "play") return;
      }

      cameraX = clamp(
        player.x + player.w / 2 - VIEW_W / 2,
        0,
        level.width * TILE - VIEW_W
      );

      cameraY = clamp(
        player.y + player.h / 2 - VIEW_H / 2,
        0,
        Math.max(0, level.height * TILE - VIEW_H)
      );

      updateHUD();
    }

    function update(dt) {
      updateParticles(dt);

      if (gameState === "play") {
        updateGame(dt);
      }

      if (
        (gameState === "complete" || gameState === "final") &&
        particles.length < 320 &&
        Math.random() < 0.08
      ) {
        spawnConfetti(3);
      }
    }

    let last = performance.now();

    function frame(t) {
      const dt = Math.min((t - last) / 1000, 0.033);
      last = t;

      update(dt);
      draw();

      requestAnimationFrame(frame);
    }

    loadProgress();
    buildCharacterSelect();
    showScreen("title-screen");
    requestAnimationFrame(frame);
