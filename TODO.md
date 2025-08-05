# TODO: Add an AI-Assisted Generation Option

This checklist outlines the tasks to add a new, alternative schedule generation method.
The existing automated generator will be kept as the primary, fast option.
The new method will be a manual workflow using an external LLM (like Gemini) as an
advanced option for complex scenarios.

## Phase 1: UI Updates for Multiple Generation Methods
---
[ ] 1. **Provide two distinct generation buttons in `page.tsx`.**
   - Pertahankan tombol "Generate Schedule" yang ada. Mungkin bisa diubah namanya menjadi "Generate Automatically" untuk lebih jelas. Fungsionalitasnya tetap sama, yaitu memanggil `handleGenerateSchedule`.
   - Tambahkan tombol baru di sebelahnya, misalnya "Generate with AI Assistant".

[ ] 2. **Create the UI flow for the AI Assistant.**
   - Saat tombol "Generate with AI Assistant" diklik, tampilkan sebuah modal atau area baru di halaman.
   - Area ini harus berisi:
     - Sebuah text area read-only untuk menampilkan prompt yang akan di-generate (`<pre><code>` block direkomendasikan).
     - Tombol "Copy Prompt".
     - Link/tombol untuk membuka AI chat (Gemini, ChatGPT, and Claude).
     - Sebuah text area input untuk pengguna menempelkan (paste) hasil JSON dari AI.
     - Tombol "Import and Display Schedule" untuk memproses JSON yang ditempelkan.

## Phase 2: Implementing the AI-Assisted Workflow Logic
---
[ ] 1. **Create the prompt generation utility.**
   - (Sama seperti sebelumnya) Buat file baru, misal `utils/prompt-generator.ts` yang mengekspor fungsi `generatePrompt(config, personnel)`.
   - Fungsi ini harus membangun string prompt yang komprehensif berisi semua instruksi, data (config & personnel), dan semua aturan yang ada.
   - Jelaskan juga format JSON yang diharapkan sebagai output dari AI.

[ ] 2. **Implement the logic for handling the AI's JSON response.**
   - Di `page.tsx`, buat fungsi baru `handleImportSchedule()`.
   - Fungsi ini akan:
     - Mengambil string dari text area input JSON.
     - Mem-parsing string tersebut menggunakan `JSON.parse()` di dalam `try...catch` block untuk menangani error format.
     - Memvalidasi struktur JSON yang sudah di-parsing.
     - Menggunakan kelas `ScheduleValidator` yang sudah ada untuk memeriksa apakah jadwal dari AI melanggar aturan.
     - Memperbarui state `schedule` dan `violations` dengan data yang sudah divalidasi, lalu menampilkan hasilnya di UI.

## Phase 3: Code Integration and Finalization
---
[ ] 1. **Ensure both workflows coexist without conflict.**
   - Pastikan semua file yang ada (`schedule-generator.ts`, `constraint-checker.ts`, `personnel-selector.ts`, `validator.ts`) tetap ada dan tidak diubah, karena masih digunakan oleh alur "Generate Automatically".
   - State seperti `isGenerating` dan `currentAttempt` juga tetap dipertahankan untuk alur kerja otomatis.

[ ] 2. **Connect the new UI elements to their respective functions.**
   - Hubungkan tombol "Generate with AI Assistant" untuk memanggil `generatePrompt` dan menampilkan UI prompt.
   - Hubungkan tombol "Import and Display Schedule" ke fungsi `handleImportSchedule`.

[ ] 3. **Testing.**
   - Uji coba kedua alur kerja secara terpisah untuk memastikan keduanya berfungsi dengan benar.
   - Pastikan pesan error dari kedua alur (misal, "gagal menemukan personel" dari generator otomatis vs "format JSON tidak valid" dari alur AI) dapat ditampilkan dengan baik kepada pengguna.