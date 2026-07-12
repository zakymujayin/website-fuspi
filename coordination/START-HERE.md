# Start Here — Three AI CLIs

Jangan membuka tiga CLI pada checkout yang sama. Coordinator lebih dulu menyelesaikan gate M0 dan membuat worktree. Setiap AI dijalankan dengan working directory miliknya sendiri.

## Urutan mulai

1. Operator membuka `fuspi-integration` untuk merge queue saja; jangan coding fitur di sini.
2. Buka CLI GPT di `fuspi-gpt`, Claude di `fuspi-claude`, dan DeepSeek di `fuspi-deepseek`.
3. Berikan satu task manifest berbeda kepada tiap CLI. Jangan hanya berkata “baca implementation plan dan kerjakan”; task ID dan allowed paths wajib eksplisit.
4. Tiap agent membaca `AGENTS.md`, `docs/24-implementation-plan-multi-model.md`, task manifest, dan dokumen contract yang disebut manifest.
5. Worker berhenti setelah commit + handoff. Integrator mereview dan merge satu PR pada satu waktu.

## Prompt awal GPT

```text
Anda bekerja sebagai GPT Platform Owner pada worktree ini. Baca AGENTS.md, docs/24-implementation-plan-multi-model.md, lalu task manifest yang saya berikan. Kerjakan hanya allowed_paths, jalankan acceptance_commands, buat commit Conventional Commit, dan tulis HANDOFF. Jangan mengubah UI hotspot Claude atau scope task lain.
TASK_MANIFEST=<path-manifest>
```

## Prompt awal Claude

```text
Anda bekerja sebagai Claude Public Experience Owner pada worktree ini. Baca AGENTS.md, docs/03-design-system.md, docs/12-multibahasa-rtl.md, docs/24-implementation-plan-multi-model.md, lalu task manifest. Kerjakan hanya allowed_paths. Jangan mengubah schema, dependency, auth, proxy, contract, atau CI. Validasi responsive, accessibility, ID/EN/AR, dan RTL; commit lalu tulis HANDOFF.
TASK_MANIFEST=<path-manifest>
```

## Prompt awal DeepSeek

```text
Anda bekerja sebagai DeepSeek CMS Delivery & QA Owner pada worktree ini. Baca AGENTS.md, docs/24-implementation-plan-multi-model.md, lalu task manifest dan contracts yang ditunjuk. Kerjakan hanya allowed_paths; jangan mengubah schema, dependency, UI primitives, proxy, atau CI. Jalankan acceptance_commands, commit, dan tulis HANDOFF termasuk negative cases.
TASK_MANIFEST=<path-manifest>
```

Jawaban atas pertanyaan “cukup buka tiga CLI lalu suruh baca plan?” adalah: belum cukup. Worktree terpisah, manifest berbeda, lease path, base SHA, acceptance command, dan merge queue adalah pengaman yang membuat kerja simultan tidak bertabrakan.
