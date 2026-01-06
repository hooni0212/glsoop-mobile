# Welcome to your Expo app 👋

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

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## E2E tests (웹)

프로젝트에는 Playwright 기반의 웹 E2E 테스트가 준비되어 있습니다.

1. 의존성 설치
   ```bash
   npm install
   npx playwright install chromium
   ```
2. 테스트 실행 (Expo 웹 서버를 자동으로 띄우고 종료)
   ```bash
   npm run e2e:web
   ```
   - 기본 포트는 `8081`이며 `EXPO_WEB_PORT` 환경 변수로 변경 가능합니다.
   - Expo 번들이 처음 빌드될 때 시간이 다소 소요될 수 있습니다.
   - 특정 시나리오만 실행하려면 `--grep`을 활용하세요:
     ```bash
     npm run e2e:web -- --grep "Write 임시저장 UX"
     ```
