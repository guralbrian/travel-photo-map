---
description: Screenshot the app and report visual state
---

Use the Playwright MCP to:

0. Ensure both http://localhost:8000 and http://localhost:8001 are being hosted
1. Develop a checklist of expected UI features to test for function and form. Spawn two sub agents, on for each local host.
2. Have one sub agent navigate to http://localhost:8000
    2a. Take a screenshot at 1440px width, save it to ./specs/[CURRENT SPEC]/screenshots/desktop/*
3. Have another sub agent navigate to http://localhost:8001
    3a. Take a screenshot at 375px width (mobile) width, save it to ./specs/[CURRENT SPEC]/screenshots/mobile/*
4. Report any visual issues, console errors, or layout problems