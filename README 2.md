# Command Control Center v2

## Overview
Command Control Center v2 is an IDE-like layout system built with React, TypeScript, and Vite. It features resizable panels, keyboard shortcuts, and state persistence.

Now with PWA offline support, broadcastChannel sync, and CI-integrated icon pipeline.

## Features
- Modular, resizable IDE-style layout
- Keyboard shortcuts for toggling panels
- State persistence using localStorage
- Accessibility enhancements with ARIA attributes
- Responsive design with CSS Grid and Flexbox
 - Bottom panel with tabbed interface, including a built-in Linux-style terminal

- Offline support via service worker (vite-plugin-pwa)
- BroadcastChannel-based multi-tab sync
- Theming and layout persistence via localStorage
- Command result and UI state logging with exportable sessions

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/Defi-Oracle-Tooling/command-control-center-v2.git
   ```
2. Navigate to the project directory:
   ```bash
   cd command-control-center-v2
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```

## Testing
Run all tests using Vitest:
```bash
pnpm test
```

## Deployment
The project builds as a PWA and deploys via GitHub Actions to GitHub Pages.
## PWA & CI Integration

The app now supports:

- Service worker auto-registration (`registerSW.ts`)
- Manifest and icons prepared for mobile and installable use
- GitHub Actions CI/CD workflows for:
  - Icon generation
  - Build and deployment
  - Manifest validation


## Keyboard Shortcuts
- `Ctrl + B`: Toggle left panel
- `Ctrl + J`: Toggle bottom panel
- `Ctrl + Shift + P`: Open command palette (clickable UI + keyboard-accessible)

## Terminal Commands

The terminal tab in the bottom panel supports the following built-in commands:

- `help`: Lists available commands
- `echo [text]`: Prints the provided text
- `clear`: Clears the terminal history

More commands can be added via an extensible registry.

## Icon Generation (CI/CD)

The project supports automated generation of white-on-transparent SVG icons using:

```bash
./scripts/generate_icon_variants.sh
```

This script:
- Processes all icons in `src/assets/2_process/`
- Exports them into `src/assets/`
- Logs metadata and durations in `logs/summary.json`

The CI workflow (`.github/workflows/icons.yml`) ensures this is run automatically on pushes or manual dispatch.

## Accessibility
- ARIA attributes added to all interactive elements
- Fully keyboard navigable

## License
This project is licensed under the MIT License.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
