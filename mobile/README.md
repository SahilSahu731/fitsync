# Welcome to your Expo app 👋

## Missing native modules in an Android development build

`Cannot find native module 'ExpoSecureStore'` or `'ExponentImagePicker'` means
the installed Android binary does not include the packages used by the current
JavaScript. Both dependencies and config plugins are already configured. A Metro
reload or `npm install` cannot add native code to an installed app.

From `mobile/`:

1. Run `npm run build:android:dev`.
2. Install the APK from the completed EAS build on your device.
3. Run `npm run start:clean` and open the project in that development client.

Use the FitSync development client, not Expo Go (Google Sign-In requires native
code). An outdated client now shows one update message instead of cascading
Router “missing default export” and `ErrorBoundary` errors. Refresh tokens remain
in SecureStore; there is no fallback to unencrypted storage.

Run `npm run test:native` to check missing-module detection and safe loading.

## FitSync styling and launch assets

Run commands from `mobile/`.

- NativeWind scans `src/**/*.{js,jsx,ts,tsx}`. Keep screen and component classes in that tree.
- After changing Tailwind or Metro configuration, restart with `npm start -- --clear`.
- Edit `assets/brand/mark.svg`, then run `npm run assets:generate` to regenerate the app icon, Android adaptive/themed icons, splash image, and favicon.
- The native splash holds until fonts, session restoration, layout, and the logo image are ready. `src/components/brand-reveal.tsx` then plays a short pulse and wordmark reveal; reduced-motion users skip it.
- Launcher icons are static assets. The animation runs during app launch.
- Native icon and splash configuration changes require a new Android build. To test the release splash, build an internal preview with `npx eas-cli@latest build --platform android --profile preview`, then install it. Expo Go and development builds do not reproduce the complete native splash experience.
- Validate with `npm run typecheck` and `npm run lint`.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
