# Game development guidance

Before making engine, rendering, asset-budget, tooling, or performance-test decisions,
read [the shared hardware profile](.agents/hardware/ryzen-7-5825u.md).
Apply it with every relevant skill, including newly added skills. Preserve this
project's existing stack and explicit user targets. Numeric graphics budgets are
starting points, not benchmark results.

Project skills are in `.agents/skills/`; their shared references, sprite scripts,
and assets are in `.agents/skill-packs/game-studio/`. Load only the skills needed
for the current task. Keep hardware facts in the shared profile instead of
copying them into individual skills.

This repository contains browser games with an existing JavaScript/Node stack.
Do not migrate working games to Phaser, React, TypeScript, or Vite solely because
a skill uses those tools in its starter examples.
