# Deckora

React + TypeScript with Vite, Tailwind CSS, and Class Variance Authority (CVA).

## Development

```sh
npm install
npm run dev
```

`npm run build` checks TypeScript and builds for production. `npm run lint` runs Oxlint. `npm run preview` serves the production build locally.

Firebase is initialized from the project configuration in `src/firebase.ts`.
Create a Firestore database and deploy the rules and account functions with
`npx firebase-tools deploy --project deckora-c8b26 --only firestore:rules,functions`.
If prompted to authenticate first, run `npx firebase-tools login`.
Cloud Functions deployment requires the Firebase project to use the Blaze
plan. The app uses a username, password, and separate nickname; usernames and
nicknames are unique without regard to capitalization, while nickname casing
is preserved. Nicknames must be 3–15 letters or numbers. Passwords are stored
as salted scrypt hashes by the trusted Functions backend. Short passwords are
easy to guess, and there is no password-reset flow because accounts do not use
email addresses. Existing anonymous profiles are not migrated. To automatically
clean up the login rate-limit records, configure Firestore TTL on the
`authRateLimits.expiresAt` field. Game progress continues to be stored locally
in the browser. Firestore client access is restricted by `firestore.rules`.

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
