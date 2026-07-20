# myfaithعقيده

A learner platform for the Coptic Orthodox faith. It includes learner profiles,
session pages with video/reading/optional quizzes, final exams, points, and an
administrator area restricted in the interface to `probeto192@gmail.com`.

## Run locally

From this folder, run:

```powershell
node server.mjs
```

Then open `http://localhost:8000`. The included server stores course content,
learner progress, and points in `learning_platform.db` (SQLite). Opening
`index.html` directly also works using browser-only storage.

## Open it on a phone

Keep the server running, connect your phone and computer to the same Wi-Fi, and
open the `Open on your phone` address printed in the PowerShell window. If
Windows asks about firewall access, allow Node.js on **Private networks** only.

## Important production note

This is a local MVP with email-only sign-in. Before publishing publicly, replace
the sign-in with real authentication and enforce the administrator email in the
server/API as well as the interface.
