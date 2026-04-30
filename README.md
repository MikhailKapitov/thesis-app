# Thesis app source

A part of our thesis project.

## Setup

1. Install dependencies.
   ```bash
   npm install --legacy-peer-deps
   ```
2. Pull and update the submodule.
   ```bash
   git submodule update --init --recursive
   ```
3. Generate the map from the submodule.
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

- Pray and run this on iOS;
- Add all the missing server functionality (Like actually submitting files to server).
- Work on the UI/UX.
- Testing?
- Clean up the packages.
- Clean up the permissions.
- Optimisations?
