# Study Abroad Program Finder

1. Get a free Gemini API key at https://aistudio.google.com/apikey.
2. Copy `.env.example` to `.env` in this folder and set `GEMINI_API_KEY` to your key.
3. Run `npm install` and `npm start`, then open http://localhost:3000.

The app makes one Gemini request per uncached search. Filtering, sorting, search, and program details run in your browser. The key stays on the server and must never be added to `public/app.js`.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `GEMINI_API_KEY` under Project Settings > Environment Variables.
3. Deploy. The Express app is routed through the Node.js function in `vercel.json`.

Do not commit `.env`; configure the key in Vercel instead.
