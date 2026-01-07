# E2E (Web)

## 설치 (선택)

```bash
npm run e2e:install
```

## 실행

```bash
npm run e2e:web
```

Codex/CI 환경에서 안정적으로 검증하려면 아래 코어 스위트를 사용하세요.

```bash
npm run e2e:web:core
```

`npm run e2e:web`는 다음을 동시에 실행합니다. (auth/home + write 전체 스위트)

- Mock API 서버 (기본 포트: `4010`)
- Expo Web (기본 포트: `8081`)
- Playwright 테스트 실행
