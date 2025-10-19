# AI Chat + Voice Widget (React + Vite + TypeScript)

Embeddable multi-language chat + voice assistant widget. Single script tag embed, customizable via `window.AgentWidgetConfig`. Backend powered by Vercel AI SDK with Google's Gemini.

## Quickstart (Local)

1. Install deps
   - `npm install`
2. Configure API key
   - Copy `.env.example` to `.env` and set `GOOGLE_GENERATIVE_AI_API_KEY`
3. Run dev servers
   - `npm run dev:server` (Express on http://localhost:8788)
   - In another terminal: `npm run dev` (Vite on http://localhost:5173)
4. Open app: `http://localhost:5173` (default Vite app) — the widget auto-mounts on any page including this one.

## Build the embeddable bundle

```
npm run build
npm run preview
# then open http://localhost:4173/embed-test.html
```

The bundle is emitted as `dist/agent-widget.js`. Embed it on any site:

```html
<script>
  window.AgentWidgetConfig = {
    position: "bottom-right",
    theme: { primaryColor: "#4F46E5" },
    agent: { name: "HelperBot", avatar: "https://example.com/avatar.png" },
    enableVoice: true,
    languageOptions: ["en", "hi", "es"],
    context: "You are a front-end expert",
  };
</script>
<script src="https://your-cdn/agent-widget.js"></script>
```

## API

- POST `/api/chat` with JSON body: `{ messages: {role, content}[], context?: string, lang?: string }`
- Local development served by Express (`server/index.ts`).
- Vercel deployment supported via `api/chat.ts` serverless function.

## Customization

- `position`: `'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'`
- `theme`: `primaryColor`, `backgroundColor`, `textColor`, `fontFamily`
- `agent`: `name`, `avatar`
- `enableVoice`: boolean
- `languageOptions`: e.g. `['en','hi','es']`
- `context`: string passed to the LLM each request

## Tech

- Vite (library build; IIFE single-file)
- React + TypeScript
- Vercel AI SDK (`ai`, `@ai-sdk/google`) with Gemini (`gemini-1.5-flash`)
- Shadow DOM mounting to avoid host page CSS collisions

## Notion Doc

Approach and architecture notes: [link-to-notion]

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
