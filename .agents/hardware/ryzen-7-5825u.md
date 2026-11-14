# Local game-development hardware target

This is the shared hardware profile for game development on this user's mini PC.
Read it when choosing a runtime, rendering settings, asset budgets, build tooling,
or performance tests. Explicit user targets and measured results take precedence
over the starting defaults below. Do not impose this machine's limits on unrelated
remote deployment targets.

## Observed hardware

Inspected locally on 2026-11-14 with `lscpu`, `free -h`, `lspci -nn`, and DMI files:

- HC Technology HCAR5000-MI mini PC, Linux x86_64.
- AMD Ryzen 7 5825U, 8 cores / 16 threads.
- Integrated AMD Radeon Barcelo graphics, PCI ID `1002:15e7`.
- No discrete GPU detected. Do not assume dedicated graphics memory or CUDA.
- Approximately 30 GiB usable system RAM; integrated graphics shares system memory.
- Approximately 24 GiB was available during inspection; this is transient, not a budget.
- GPU driver/API support, memory-channel configuration, thermals, and sustained
  rendering performance have not been measured. No FPS guarantee follows from specs.

## Development constraints

- Preserve an existing project's engine, language, build process, and renderer.
  Do not introduce Phaser, React, TypeScript, Vite, or a physics engine merely
  because a skill recommends them for new projects.
- For a new 2D browser game, prefer Phaser or a simple existing Canvas stack.
  For requested browser 3D, use a modest Three.js scene; use React Three Fiber
  when the project already uses React or the user selects it.
- Godot with its Compatibility renderer is a candidate for native 2D/lightweight
  3D work; verify driver support before setup. Do not default to a heavyweight
  engine or high-end rendering features without a task-specific reason.
- Treat GPU fill rate, shared-memory bandwidth, draw calls, and shader cost as
  likely constraints. Diagnose before reducing visual quality or changing architecture.
- Do not require local GPU AI generation. Use available generation tools when
  requested, or ordinary authored/procedural assets; do not install model stacks
  or introduce paid services merely to satisfy an asset skill.

## Starting graphics budgets — tunable, not measured hardware limits

- Aim for 60 FPS (16.7 ms frame interval) in representative gameplay. Offer a
  stable 30 FPS option for heavier 3D when appropriate, keeping simulation timing
  independent of rendering. Report measured outcomes instead of assuming success.
- Start GPU-heavy 3D at device pixel ratio 1 and offer a render-scale control;
  test at 1280x720 and 1920x1080. Keep DOM text sharp. Do not lower resolution in
  an existing game unless measurement or the user justifies the change.
- Default new 3D scenes to simple lighting, baked/blob shadows, and no expensive
  full-screen post-processing. Add dynamic shadows, bloom, SSAO, reflections,
  volumetrics, and extra passes only when they fit the measured frame budget.
- Start ordinary 3D textures around 512–1024 pixels; use larger textures only for
  visible detail that needs them. Start sprite atlas pages at 2048 or smaller,
  check runtime limits, and preserve readability. Retain full-quality source assets.
- Batch/instance repeated geometry, cull offscreen work, use LOD for large worlds,
  bound particles and physics work, and dispose of replaced GPU resources.
- Load assets by scene or region. Judge decoded texture memory as well as download
  size; compressed downloads alone do not prove low GPU memory use.
- Pause unnecessary rendering in hidden tabs and static/paused scenes while
  preserving required multiplayer/network behavior. Avoid per-frame DOM/React
  updates for unchanged HUD data.

## Verification

- For rendering/performance changes, test a representative busy scene, movement,
  effects, menus, and scene reloads. Include a sustained run (for example five
  minutes) when thermal slowdown or resource growth is relevant.
- Record browser, renderer/backend, resolution, DPR, quality settings, frame-time
  distribution (including p95), and obvious stalls. Observe resource growth across
  reloads; use GPU timings when available without treating CPU timings as GPU time.
- Headless software rendering can check correctness but cannot certify this GPU's
  performance. Confirm hardware acceleration for hardware performance claims.
- Run heavy rendering/asset jobs and performance tests sequentially by default so
  contention does not distort measurements. Use measured throughput to tune builds.
- If target-device testing is unavailable, say so and leave performance unverified.

## Maintenance

Update this file when hardware or the intended target changes. Keep skill-specific
guidance linked here rather than copying specs into each skill. Upstream skill
examples are templates; apply this profile to their defaults before using them.
