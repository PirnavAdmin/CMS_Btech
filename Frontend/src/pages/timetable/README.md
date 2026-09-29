# Timetable frontend prototype

This phase is deliberately frontend-only. The Timetable Management screen does not load academic, timetable, faculty, or student records from APIs and does not create fake HTTP endpoints.

## Service architecture

- `src/services/timetableMockData.js` owns stable demo IDs, 2026-2027 academic masters, CSE semester-three sections and subjects, default weekly frequencies, faculty coverage, rooms, and daily defaults.
- `src/services/timetableDemoService.js` is the UI-facing repository/service. It owns the isolated `pirnav_timetable_demo` localStorage key and every persisted timetable operation.
- `src/utils/timetableDemoGenerator.js` owns daily period calculation and coordinated section generation.
- `src/utils/timetableDemoValidator.js` owns schedule validation, cross-section collision checks, and suggested slots.
- `src/pages/timetable/TimetableManagement.jsx` renders the demo builder and faculty preview through those services.

## Demo behavior

Generation coordinates the sections in the selected branch and semester. It checks section, faculty, room, weekday, break/lunch, and lab-block availability. Unplaced subject periods are recorded as unscheduled issues. Generate Missing retains existing entries and fills only unmet weekly frequencies. Draft edits, validation and publication remain browser-local. Published schedules support a temporary edit copy, conflict validation, save, and cancel; faculty preview derives from the saved published section schedules. Reset Demo Data requires confirmation.

No Timetable backend APIs are used in this prototype. Backend integration should replace the mock data and repository/service in `timetableDemoService.js`; generation and validation remain isolated utilities.

## Verification

Run `npm.cmd run build`, `npm.cmd run lint`, and `node --test src/utils/timetableDemoWorkflow.test.js` from `Frontend`.

Later API integration should replace the mock data and repository in `timetableDemoService.js`. The UI and scheduling utilities can remain API-independent; authenticated faculty identity can replace the demo faculty selector.
