# Chess Analysis Web App

Web ini adalah aplikasi analisis catur berbasis React + Vite + Tailwind CSS yang menggabungkan:

- Tablebase Lichess (`tablebase.lichess.ovh`) untuk endgame
- Engine online Stockfish (`stockfish.online/api/s/v2.php`) untuk evaluasi, PV, MultiPV, dan saran langkah
- Opening Explorer lengkap (ECO + variasi + favorit + repertoire)

## Teknologi

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- `chess.js` untuk validasi dan simulasi langkah
- `react-chessboard` untuk papan catur interaktif
- `framer-motion` untuk animasi panel

## Cara Menjalankan

1. Install dependency:

```bash
npm install
```

2. Jalankan development server:

```bash
npm run dev
```

3. Build production:

```bash
npm run build
```

## Struktur Folder

```text
.
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ publik
│    └─ icons
└─ src
   ├─ App.tsx
   ├─ main.tsx
   ├─ index.css
   ├─ components
   │  ├─ AnalysisBoardSection.tsx
   │  ├─ AnalysisSidePanel.tsx
   │  ├─ ChessBoardPanel.tsx
   │  ├─ EngineLinesPanel.tsx
   │  ├─ EngineSettingsModal.tsx
   │  ├─ EvaluationBar.tsx
   │  ├─ FenInput.tsx
   │  ├─ MoveList.tsx
   │  ├─ OpeningExplorer.tsx
   │  ├─ ExamplePositions.tsx
   │  ├─ MoveHistory.tsx
   │  └─ PositionInfo.tsx
   ├─ data
   │  └─ openingBook.ts
   ├─ features
   │  └─ analysis
   │     ├─ constants.ts
   │     ├─ engine.ts
   │     └─ tablebase.ts
   ├─ types
   │  └─ tablebase.ts
   └─ utils
      ├─ cn.ts
      └─ tablebase.ts
```

## Penjelasan Tiap Folder

### `src/`
Folder inti source code aplikasi.

### `src/components/`
Berisi komponen UI yang dipakai untuk membangun layout analysis.

### `src/features/analysis/`
Berisi logic domain khusus fitur analysis agar tidak menumpuk di `App.tsx`.

### `src/data/`
Berisi data statis, seperti opening book dan variasinya.

### `src/types/`
Berisi definisi tipe TypeScript agar struktur data konsisten.

### `src/utils/`
Berisi helper umum (API, formatter, util className).

## Penjelasan Tiap File (Lengkap)

## Root Project

| File | Fungsi |
|---|---|
| `index.html` | Template HTML utama tempat React di-mount (`#root`). |
| `package.json` | Konfigurasi dependency dan script npm. |
| `tsconfig.json` | Konfigurasi TypeScript project. |
| `vite.config.ts` | Konfigurasi Vite bundler dan plugin. |

## File Utama di `src/`

| File | Fungsi |
|---|---|
| `src/main.tsx` | Entry point React. Merender `<App />` ke `#root`. |
| `src/App.tsx` | Orchestrator utama aplikasi: state global, query tablebase, query engine, history, navigasi, sinkronisasi antar panel. |
| `src/index.css` | Global style (dark theme, tinggi viewport penuh, custom scrollbar, animasi panel). |

## Komponen di `src/components/`

| File | Fungsi |
|---|---|
| `AnalysisBoardSection.tsx` | Area kiri: label pemain, evaluation bar, papan catur, input FEN, dan quick example positions. |
| `AnalysisSidePanel.tsx` | Area kanan: header analysis, kontrol variant/flip/auto, tab `analysis/games/explore`, status, replay control, tombol action. |
| `ChessBoardPanel.tsx` | Komponen papan catur interaktif: drag/drop, klik langkah, highlight, arrow engine, arrow manual klik kanan, marker kotak merah. |
| `EngineLinesPanel.tsx` | Menampilkan PV/MultiPV engine dalam format baris line + score + langkah SAN + expand/collapse. |
| `EngineSettingsModal.tsx` | Popup pengaturan engine (ON/OFF, depth, multiPV, arrow mode, arrow count, thread, hash, toggle PV/arrows, dll). |
| `EvaluationBar.tsx` | Bar evaluasi vertikal hitam-putih di samping papan berdasarkan score engine. |
| `FenInput.tsx` | Input FEN: load FEN, reset posisi, tampilan FEN aktif, copy ke clipboard. |
| `MoveList.tsx` | Daftar langkah tablebase (SAN, kategori, DTZ/DTM) dan klik untuk memainkan langkah. |
| `OpeningExplorer.tsx` | Explorer opening lengkap: search, filter ECO, favorit, repertoire pribadi, import/export JSON. |
| `ExamplePositions.tsx` | Komponen daftar contoh posisi endgame (legacy/helper). |
| `MoveHistory.tsx` | Komponen history langkah versi compact (legacy/helper). |
| `PositionInfo.tsx` | Komponen ringkasan status posisi tablebase (legacy/helper). |

## Feature Logic di `src/features/analysis/`

| File | Fungsi |
|---|---|
| `constants.ts` | Konstanta domain analysis: FEN default, FEN new game, daftar variant, batas piece tablebase, default engine settings. |
| `engine.ts` | Utility engine: parse bestmove UCI, parse PV, formatter score, request ke Stockfish API, sorting score berdasarkan giliran. |
| `tablebase.ts` | Utility domain tablebase: scoring kategori, cache key, validasi batas piece per variant. |

## Data di `src/data/`

| File | Fungsi |
|---|---|
| `openingBook.ts` | Database opening dan variasi (ECO + nama + urutan langkah SAN), dipakai tab Explore. |

## Type Definition di `src/types/`

| File | Fungsi |
|---|---|
| `tablebase.ts` | Tipe TypeScript untuk category, move category, hasil API tablebase, move tablebase, variant, dan history entry. |

## Util Umum di `src/utils/`

| File | Fungsi |
|---|---|
| `tablebase.ts` | API client ke Lichess tablebase + helper warna kategori, formatter kategori, hitung jumlah bidak, dan contoh posisi. |
| `cn.ts` | Helper gabung className (`clsx` + `tailwind-merge`). |

## Alur Data Singkat

1. Posisi papan berubah dari drag/drop, klik langkah, load FEN, atau load opening line.
2. `App.tsx` menyimpan state FEN dan history.
3. Jika aktif, tablebase query dijalankan ke `tablebase.lichess.ovh` sesuai variant dan batas piece.
4. Jika engine ON, query dijalankan ke `stockfish.online` untuk evaluasi/PV/MultiPV.
5. Hasil query dikirim ke komponen panel:

- kiri: board + evaluation bar + arrows
- kanan: engine lines, tablebase move list, history, opening explorer

## Catatan Penting

- Engine online saat ini efektif untuk `standard`.
- Tablebase memiliki batas jumlah bidak berbeda per variant.
- Beberapa komponen lama (`PositionInfo`, `MoveHistory`, `ExamplePositions`) masih ada sebagai komponen pendukung/legacy.

## Rencana Pengembangan (Opsional)

- Menambah hook terpisah (`useEngineAnalysis`, `useTablebase`) agar `App.tsx` lebih ramping.
- Menambah unit test untuk parser engine dan validasi FEN workflow.
- Menambah preset layout responsive khusus mobile.
