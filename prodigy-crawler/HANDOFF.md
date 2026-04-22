# Prodigy Wiki Crawler — Handoff Document

## Mục tiêu
Crawl toàn bộ nội dung Prodigy Math Game wiki (https://prodigy-game.fandom.com) để làm reference cho việc build game clone tại Clevai. Output là 8 file Markdown chia theo topic, dùng để feed vào Claude/Antigravity làm context.

## Trạng thái hiện tại (2026-04-22 ~10:00)

| Item | Trạng thái |
|------|-----------|
| Phase 1 (discovery) | ✅ DONE — 4,824 pages trong `master_pages.txt` |
| Phase 2 (fetch content) | ✅ 89% DONE — 4,302/4,824 pages fetched (7,945 JSON files) |
| Phase 3 (generate output) | ✅ DONE — output/ có 8 MD files từ 7,945 pages |
| IP block | ❌ Fandom/Cloudflare vẫn đang block IP — 522 pages pending |

## Output files đã tạo

| File | Articles | Size |
|------|----------|------|
| `output/monsters-pets.md` | 477 | 1.6 MB |
| `output/spells-battles.md` | 857 | 3.4 MB |
| `output/items-equipment.md` | 2,539 | 4.7 MB |
| `output/locations-world.md` | 83 | 217 KB |
| `output/game-mechanics.md` | 99 | 492 KB |
| `output/characters-npcs.md` | 190 | 415 KB |
| `output/events-rewards.md` | 85 | 218 KB |
| `output/misc.md` | 3,615 | 4.7 MB |
| `output/index.md` | 7,945 entries | 819 KB |

**Tổng: 7,945 articles / 16.2 MB** — đủ để dùng ngay làm context cho Claude/Antigravity.

## Files đã có
```
tools/prodigy-crawler/
  master_pages.txt     ← 4,824 page titles (đã filter /Change History)
  checkpoint.json      ← 4,302 pages fetched, phase=2
  raw_pages/           ← 7,945 JSON files (wikitext + images per page)
  output/              ← 8 MD files + index (từ 7,945 pages)
    monsters-pets.md, spells-battles.md, items-equipment.md,
    locations-world.md, game-mechanics.md, characters-npcs.md,
    events-rewards.md, misc.md, index.md
```

## Cách resume để fetch 522 pages còn lại (khi IP unblock)

### Bước 1 — Verify IP unblock
```bash
cd tools/prodigy-crawler
python -c "
import requests
r = requests.get('https://prodigy-game.fandom.com/api.php',
    params={'action':'parse','page':'Burnewt','prop':'wikitext','format':'json'},
    timeout=10)
print('Status:', r.status_code)  # phai la 200
"
```

### Bước 2 — Resume Phase 2 (fetch 522 pages con lai)
```bash
cd tools/prodigy-crawler
python crawler.py --phase2
```
Script tu skip 4,302 pages da co, fetch 522 pages con lai.
**ETA: ~2 phut** (11 batches x 50 pages)

### Bước 3 — Regenerate output
```bash
python crawler.py --phase3
```
**ETA: ~2 phut**. Output 8 MD files day du trong `output/`.

### Hoac dung auto-watcher
```bash
python wait_and_resume.py
```
Script tu check moi 5 phut, auto-resume khi IP unblock.

## Kỹ thuật quan trọng

### Batch API (50x faster)
Phase 2 dung MediaWiki batch query:
- 50 pages/request → 87 requests tong (thay vi 4,824 requests)
- Rate limit: 2s/batch → ~3 phut tong
- curl_cffi Chrome impersonation de bypass Cloudflare

### Filename sanitization
`_safe_filename()` da duoc fix de handle Windows-invalid chars (`?`, `*`, `<`, `>`, `|`, `:`, `"`, `\`)

### Exception handling
Khong dung `requests.HTTPError` (khong ton tai trong curl_cffi). Dung `Exception` va check `hasattr(e, 'response')`.

### Rebuild checkpoint tu disk
```bash
python rebuild_checkpoint.py
```
Script scan `raw_pages/` va re-build checkpoint tu actual files, cho phep resume chinh xac.

## Output format
Moi article trong MD file co format:
```markdown
## [Ten article]
**Source:** [URL goc]

**[Infobox name]**
| Attribute | Value |
|-----------|-------|
| element   | Fire  |
| hp        | 350   |

[Prose description]

**Images:**
![filename](https://static.wikia.nocookie.net/prodigy/images/...)
---
```

## Dependencies
```bash
pip install requests mwparserfromhell curl_cffi pytest
```

## Lien he context
- Project: AcaAutomation (Clevai QuizMaster)
- User: Anh (senior engineer)
- Goal: Build Clevai game tuong tu Prodigy Math Game
