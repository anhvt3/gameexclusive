# Harness Checklist — Game_SS3_exclusive

> **Context:** Setup harness theo 6 tầng (Tool / Context / Memory / Feedback / Verification / Observability)
> **Goal:** Level 1 (chaos) → Level 2 (baseline verification gate)
> **Date:** 22/04/2026
> **Prereq:** Node.js 20+, Git, VS Code (optional)
> **Ước tính thời gian anh chạy:** 30-45 phút

---

## 0. Overview

Tất cả template file nằm trong `Game_exclusive/docs/harness/templates/`. Anh chạy command theo thứ tự, copy file theo hướng dẫn.

**Folder đích sau khi hoàn thành:**
```
Game_exclusive/
├── app/                          ← Vite project (anh init ở step 1)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── eslint.config.js
│   ├── .prettierrc
│   ├── .gitignore
│   ├── .lintstagedrc.json
│   ├── .husky/
│   │   └── pre-commit
│   ├── scripts/
│   │   ├── verify.ts
│   │   └── log-run.ts
│   ├── src/
│   │   ├── bus/EventBus.ts       (sample from template)
│   │   └── __tests__/sanity.test.ts
│   └── tests/e2e/smoke.spec.ts
├── .github/
│   ├── workflows/ci.yml
│   └── PULL_REQUEST_TEMPLATE.md
└── CLAUDE.md                     (append harness section)
```

---

## Step-by-step Commands

### ✅ Step 1. Init Git + Vite project

```bash
cd D:/projectlocal/clevai/Game_exclusive
git init
git branch -M main

# Create Vite app (chọn React + TypeScript khi hỏi)
npm create vite@latest app -- --template react-ts
cd app
```

### ✅ Step 2. Install all dependencies

```bash
# Core runtime
npm install phaser@^3.80.0 zustand mitt zod react-router-dom

# Dev - Test
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D @playwright/test

# Dev - Lint/Format
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks
npm install -D eslint-plugin-boundaries eslint-plugin-import
npm install -D prettier eslint-config-prettier

# Dev - Git hooks
npm install -D husky lint-staged

# Dev - Observability
npm install -D tsx

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Playwright browsers (1 lần download ~200MB)
npx playwright install chromium

# Husky init
npx husky init
```

### ✅ Step 3. Copy config templates

Từ `Game_exclusive/docs/harness/templates/`, copy từng file:

| From (templates/) | To (app/) |
|---|---|
| `package.json` | **merge** vào `app/package.json` (scripts + lint-staged section) |
| `tsconfig.json` | `app/tsconfig.json` (overwrite) |
| `vite.config.ts` | `app/vite.config.ts` |
| `vitest.config.ts` | `app/vitest.config.ts` |
| `playwright.config.ts` | `app/playwright.config.ts` |
| `eslint.config.js` | `app/eslint.config.js` |
| `.prettierrc` | `app/.prettierrc` |
| `.gitignore` | `app/.gitignore` (merge với có sẵn) |
| `.lintstagedrc.json` | `app/.lintstagedrc.json` |
| `pre-commit` | `app/.husky/pre-commit` (chmod +x) |
| `verify.ts` | `app/scripts/verify.ts` |
| `log-run.ts` | `app/scripts/log-run.ts` |
| `EventBus.ts` | `app/src/bus/EventBus.ts` |
| `sanity.test.ts` | `app/src/__tests__/sanity.test.ts` |
| `smoke.spec.ts` | `app/tests/e2e/smoke.spec.ts` |
| `ci.yml` | `Game_exclusive/.github/workflows/ci.yml` |
| `PULL_REQUEST_TEMPLATE.md` | `Game_exclusive/.github/PULL_REQUEST_TEMPLATE.md` |
| `CLAUDE_harness_snippet.md` | **append** vào `Game_exclusive/CLAUDE.md` |

Command nhanh (Bash/PowerShell adjust tuỳ OS):

```bash
cd D:/projectlocal/clevai/Game_exclusive
TEMPLATES=docs/harness/templates

# App configs
cp $TEMPLATES/tsconfig.json app/
cp $TEMPLATES/vite.config.ts app/
cp $TEMPLATES/vitest.config.ts app/
cp $TEMPLATES/playwright.config.ts app/
cp $TEMPLATES/eslint.config.js app/
cp $TEMPLATES/.prettierrc app/
cp $TEMPLATES/.lintstagedrc.json app/
cp $TEMPLATES/pre-commit app/.husky/pre-commit
chmod +x app/.husky/pre-commit

# Scripts + source seeds
mkdir -p app/scripts app/src/bus app/src/__tests__ app/tests/e2e
cp $TEMPLATES/verify.ts app/scripts/
cp $TEMPLATES/log-run.ts app/scripts/
cp $TEMPLATES/EventBus.ts app/src/bus/
cp $TEMPLATES/sanity.test.ts app/src/__tests__/
cp $TEMPLATES/smoke.spec.ts app/tests/e2e/

# GitHub
mkdir -p .github/workflows
cp $TEMPLATES/ci.yml .github/workflows/
cp $TEMPLATES/PULL_REQUEST_TEMPLATE.md .github/

# Merge package.json scripts manually (xem file template)
# Append CLAUDE_harness_snippet.md → CLAUDE.md manually
```

### ✅ Step 4. Merge `package.json` scripts

Mở `app/package.json`, thêm scripts (giữ nguyên scripts Vite default):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "verify": "tsx scripts/verify.ts",
    "log-run": "tsx scripts/log-run.ts",
    "prepare": "husky"
  }
}
```

Và thêm:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

### ✅ Step 5. Append CLAUDE.md harness section

Mở `Game_exclusive/CLAUDE.md` (tạo nếu chưa có), append nội dung từ `docs/harness/templates/CLAUDE_harness_snippet.md`.

### ✅ Step 6. Verification — chạy smoke test

```bash
cd app

npm run lint             # zero errors
npm run typecheck        # zero errors
npm run test:run         # 1/1 sanity pass
npm run test:e2e         # 1/1 smoke pass (browser mở Vite dev server)
npm run verify           # AP compliance check PASS
npm run build            # dist/ generated
```

Nếu tất cả đều PASS → Sprint 1 harness complete. Level 1 → Level 2 ✅

### ✅ Step 7. First commit

```bash
cd D:/projectlocal/clevai/Game_exclusive
git add .
git commit -m "chore: harness foundation Sprint 1 — Vite+TS+Vitest+Playwright+ESLint+verify.ts"
```

Pre-commit hook sẽ chạy lint-staged. Nếu pass → commit thành công.

### ✅ Step 8. Setup GitHub repo (optional)

```bash
gh repo create clevai/Game_SS3_exclusive --private
git remote add origin git@github.com:clevai/Game_SS3_exclusive.git
git push -u origin main
```

CI sẽ chạy lần đầu tiên — xem Actions tab.

---

## 🎯 Exit Criteria Sprint 1

- [ ] H1 `git log` ≥ 1 commit
- [ ] H2 `npm run dev` boots Vite ở :5173
- [ ] H3 `npm test` passes sanity
- [ ] H4 `npm run test:e2e` passes smoke
- [ ] H5 `npm run lint` zero errors + `npm run format:check` zero diffs
- [ ] H6 ESLint boundary rule active — test: tạo file `src/game/bad.ts` import React → lint fail
- [ ] H7 Pre-commit hook chặn lint fail
- [ ] H8 `npm run verify` exit 0
- [ ] H9 GitHub Actions CI green (nếu push repo)
- [ ] H10 `runs.jsonl` có ≥ 1 entry
- [ ] H11 `.github/PULL_REQUEST_TEMPLATE.md` exists
- [ ] H12 CLAUDE.md có section "Harness Engineering Principles"

## Scorecard sau Sprint 1 (target)

```
Tool:          ██████░░░░  70%   ↑ from 0%
Context:       ██████░░░░  60%   ↑ from 35%
Memory:        ███████░░░  70%   ↑ from 45%
Feedback:      █████░░░░░  50%   ↑ from 0%
Verification:  █████░░░░░  50%   ↑ from 0%
Observability: ██░░░░░░░░  20%   ↑ from 0%

Level: 2 (có tool + memory + basic verify gate)
```

## Tiếp theo (Sprint 2)

Chạy song song với ISP Step 1-5:
- H13 EventBus API force pair on/off
- H14 Zod adapter-only pattern
- H15 Axios Idempotency interceptor (chỉ cần khi Phase 3)
- H16 Claude Code PreToolUse + Stop hooks
- H17 Coverage threshold (80% domain / 60% UI)
- H18 Doc size pre-commit check
- H19 Sentry init

## Troubleshooting

| Lỗi | Fix |
|---|---|
| `npm create vite` hỏi framework | Chọn React → TypeScript |
| Husky hook không chạy | `chmod +x .husky/pre-commit` + check `prepare` script |
| ESLint boundary plugin fail | Confirm install `eslint-plugin-boundaries` |
| Playwright browser download chậm | Dùng mirror `PLAYWRIGHT_DOWNLOAD_HOST=...` |
| Windows path issue trong verify.ts | Dùng `path.posix` hoặc `import.meta.url` |

---

**Sau khi Sprint 1 complete:** Em update AP v1.1 + ISP v1.1 với harness decisions + CEO review decisions đã chốt.
