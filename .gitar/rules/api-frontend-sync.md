---
title: "API and frontend stay in sync"
description: "Catch backend changes that would break the frontend"
when: "PRs that change the /search endpoint's parameters or response fields in app/"
actions: "Check that static/app.js uses the same names, and comment with any mismatch"
---