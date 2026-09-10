# Baby Growth Tracker Mobile

This folder contains a Flutter mobile app for the Baby Growth Tracker project.

## Requirements

- Flutter SDK installed locally
- Supabase project configured with the same `babies` and `measurements` tables used by the web app

## Run locally

```bash
cd mobile
flutter pub get
flutter run --dart-define=SUPABASE_URL="your-supabase-url" --dart-define=SUPABASE_ANON_KEY="your-anon-key"
```

## Notes

- The app uses Supabase for authentication and persistence.
- It mirrors the core flow of the web app: login, setup baby details, record measurements, and review growth summaries.
- Android and iOS project files are scaffolded for native app builds.
