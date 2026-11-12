# Deckora

React + TypeScript with Vite, Tailwind CSS, and Class Variance Authority (CVA).

## Development

```sh
npm install
npm run dev
```

`npm run build` checks TypeScript and builds for production. `npm run lint` runs Oxlint. `npm run preview` serves the production build locally.

Firebase is initialized from the project configuration in `src/firebase.ts`.
Enable Email/Password sign-in in Firebase Authentication and create a Firestore
database. Deploy the Firestore rules with
`npx firebase-tools deploy --project deckora-c8b26 --only firestore:rules`. If
prompted to authenticate first, run `npx firebase-tools login`. This setup uses
Firebase Authentication directly and does not require the Blaze plan.

The app uses email/password accounts and a separate nickname. Nicknames are
unique without regard to capitalization, preserve the casing entered, and
must be 3–15 letters or numbers. Firebase Authentication requires passwords
with at least 6 characters. Existing anonymous profiles are not migrated.
Existing anonymous or username-only profiles are not migrated, and any
previously deployed Cloud Functions must be removed separately. Game progress
continues to be stored locally in the browser. Firestore client access is
restricted by `firestore.rules`.

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
