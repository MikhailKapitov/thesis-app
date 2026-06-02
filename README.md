# Thesis app source

A part of our thesis project.

## Setup

After cloning this repository, make sure to run `git submodule update --init --recursive` first.

1. Install dependencies.
   ```bash
   npm install --legacy-peer-deps
   ```
2. Init the submodule. Only needs to be done once.
   ```bash
   git submodule update --init --recursive
   ```
3. Generate the map from the submodule. You should do this every time it is updated.
   ```bash
   npm run gen-map
   ```
4. Create a .env file and add the required fields (See code or .env.example).
5. Run the app (Android).
   ```bash
   npx expo run:android
   ```

## Current pages

- Login
- Registration
- Map viewer
- Recorder
- Irrelevant template ones

## TODO

- Add the remaining missing server functionality (Mostly settings).
- Work on the UI/UX.
- Testing?
- Clean up the packages.
- Clean up the permissions.
- Code cleanup.
- Optimisations?
