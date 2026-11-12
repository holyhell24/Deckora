# Deckora

React + TypeScript with Vite, Tailwind CSS, and Class Variance Authority (CVA).

## Development

```sh
npm install
npm run dev
```

`npm run build` checks TypeScript and builds for production. `npm run lint` runs Oxlint. `npm run preview` serves the production build locally.

Firebase is initialized from the project configuration in `src/firebase.ts`.
The app currently initializes Firebase only; add and initialize Firebase
products such as Authentication or Firestore when needed. Firebase web
configuration values are public client identifiers, so secure Firebase data
with appropriate Firebase Security Rules.

## Structure

```text
src/
  assets/         Images and other imported assets
  components/     Shared reusable components
    ui/           Common UI primitives styled with CVA
  routes/         Page components
  types/          Types shared by multiple components
  constants/      Constants shared across the application
  App.tsx         Application entry component
  index.css       Tailwind import and global styles
```

Keep types and constants close to their owner until multiple components need them. Then move them to the shared folders at the source root (`src/`).

`src/components/ui/button.tsx` provides primary/secondary variants and sm/md/lg sizes. Its `className` supports Tailwind overrides through `tailwind-merge`.

Tailwind uses the official Vite plugin: https://tailwindcss.com/docs/installation/using-vite
