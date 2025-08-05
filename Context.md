# PRD: Shift Schedule Generator Web App (TODO.md)

This document outlines the product requirements for a shift schedule generator web application.
The application is client-side only (no backend) and uses the browser's local storage for data persistence.

## 1. Project Summary

*   **Project Goal**: To create a web app that automates the generation of a monthly shift schedule for a team composed of `shift` and `non_shift` roles, based on a complex set of rules.
*   **Target User**: A manager or person-in-charge responsible for creating shift schedules.
*   **Tech Stack**: ~~HTML, CSS, JavaScript (Vanilla JS)~~ **Next.js, React, TypeScript, TailwindCSS**.

---

## 2. Core Features

*   **Schedule Configuration**: Allows users to input all necessary parameters, such as date range, personnel list, and leave requests.
*   **Automatic Schedule Generator**: The system automatically generates a valid schedule based on all defined rules.
*   **Schedule Visualization**: Displays the schedule in two formats:
    *   Calendar View (Grid)
    *   Text/Summary View (List)
*   **Shift Statistics**: Shows a summary of shift counts (P, S, M) and leave counts (L, LT, CT) for each person.
*   **Local Data Persistence**: All user inputs are saved in local storage, so they are not lost on page refresh.
*   **Error Handling**: Provides a notification if a schedule cannot be created with the given configuration and rules (e.g., insufficient staff).

---

## 3. User Flow

1.  The user opens the web application.
2.  The user selects a month (e.g., August 2024).
3.  The user inputs personnel data (`name`, `role`).
4.  The user enters specific requests for each `shift` employee (leave requests, etc.).
5.  The user clicks the **"Generate Schedule"** button.
6.  The system processes and attempts to create the schedule.
    *   **On Success**: The app displays the schedule in calendar format along with statistics.
    *   **On Failure**: The app displays a detailed error message explaining which specific rules were violated or constraints could not be met (e.g., "Schedule could not be generated: Insufficient shift personnel for night shifts on weekends", "Rule violation: John Doe would exceed maximum consecutive workdays", "Constraint conflict: Not enough staff available on August 15th due to overlapping leave requests").
7.  The user can view the results, and the input data remains saved for the next session.

---

## 4. Detailed Requirements & Rules

### **Input Data**

*   **Month Selection**: Choose month and year (e.g., August 2024) - the system will automatically determine the date range.
*   **List of Public Holidays**: Input dates considered national holidays within the month.
*   **Special Date Configurations**: Override default staffing requirements for specific dates (e.g., "August 15th: Morning=3, Afternoon=4, Night=1").
*   **Global Configuration (per month)**:
    *   `max_night_shifts`: A number (e.g., 8).
    *   `max_default_leaves`: A number (e.g., 10).
*   **Personnel Data (dynamically addable rows)**:
    *   `name`: Text.
    *   `role`: Selection (`shift`, `non_shift`).
    *   `requested_leaves`: Array of dates (e.g., `[5, 12, 19]`).
    *   `requested_extra_leaves` (LT): Array of dates.
    *   `requested_annual_leaves` (CT): Array of dates.

### **Scheduling Logic Rules**

#### **Daily Staffing Rules**
*   **Weekdays (Mon-Fri)**:
    *   Morning (P): 1 person (`shift` or `non_shift`).
    *   Afternoon (S): 2 people (`shift` only).
    *   Night (M): 2 people (`shift` only).
*   **Weekends (Sat-Sun) & Public Holidays**:
    *   Morning (P): 2 people (`shift` only).
    *   Afternoon (S): 2 people (`shift` only).
    *   Night (M): 3 people (`shift` only).
*   **Special Date Overrides**:
    *   For specific dates, users can set custom staffing requirements that override the default rules above.
    *   Example: "August 15th requires Morning=3, Afternoon=4, Night=1 due to special event."

#### **Shift Sequence Rules (for `shift` role)**
1.  If today's shift is **Night (M)**, tomorrow's options are only **Night (M)** or **Leave (L)**.
2.  If today's shift is **Afternoon (S)**, tomorrow's options are only **Afternoon (S)**, **Night (M)**, or **Leave (L)**.
3.  If today's shift is **Morning (P)**, tomorrow's options can be **Morning (P)**, **Afternoon (S)**, **Night (M)**, or **Leave (L)**.
4.  After 2 consecutive **Night (M)** shifts, the next 2 days **must be Leave (L)**.
5.  A maximum of 5 consecutive workdays. After this, it should ideally be followed by 2 leave days (this is a soft/optional rule but preferred).

#### **Monthly Quota Rules (for `shift` role)**
1.  **Night (M)** shifts: Max of 8-9 times (based on `max_night_shifts` input).
2.  **Default Leave (L)**: Max of 9-10 times (based on `max_default_leaves` input). This total **excludes** Extra Leaves (LT) and Annual Leaves (CT).
3.  Morning (P) and Afternoon (S) shifts: No maximum limit.

#### **`non_shift` Role Rules**
1.  Can only cover **Morning (P)** shifts.
2.  Can only cover shifts on **weekdays**. Cannot cover weekends or public holidays.
3.  **Priority**: The algorithm must prioritize `shift` personnel for Morning shifts. `non_shift` personnel are used as backups **only if** no `shift` person can fill the slot without violating other rules.

### **Output Data**
*   **Calendar View**:
    *   A `Date x Personnel Name` grid.
    *   Cell content: Shift code (P, S, M) or leave code (L, LT, CT).
    *   Use different colors for each code for readability.
*   **Text/Summary View**:
    *   A list by date, showing who is on duty for P, S, and M shifts.
*   **Statistics per Person**:
    *   Name: John Doe
    *   Total Morning: 5
    *   Total Afternoon: 6
    *   Total Night: 8
    *   Total Leave: 9
    *   Total Extra Leave: 2
    *   Total Annual Leave: 1

---

## 5. Data Structure (Suggestion for Local Storage)

A JSON format is recommended for storing all data.

```json
{
  "config": {
    "month": "2024-08",
    "publicHolidays": ["2024-08-17"],
    "specialDates": {
      "2024-08-15": {"P": 3, "S": 4, "M": 1}
    },
    "maxNightShifts": 8,
    "maxDefaultLeaves": 10
  },
  "personnel": [
    {
      "id": 1,
      "name": "Andi",
      "role": "shift",
      "requestedLeaves": ["2024-08-05", "2024-08-12"],
      "requestedExtraLeaves": ["2024-08-20"],
      "requestedAnnualLeaves": []
    },
    {
      "id": 2,
      "name": "Budi",
      "role": "shift",
      "requestedLeaves": [],
      "requestedExtraLeaves": [],
      "requestedAnnualLeaves": ["2024-08-29", "2024-08-30"]
    },
    {
      "id": 3,
      "name": "Citra",
      "role": "non_shift",
      "requestedLeaves": [],
      "requestedExtraLeaves": [],
      "requestedAnnualLeaves": []
    }
  ],
  "schedule": {
    "2024-08-01": {
      "P": [2], "S": [1, 4], "M": [5, 6, 7]
    }
  }
}
```

---

## 6. Development Tasks (Checklist)

### ✅ **Phase 1: Setup & Basic UI**
- [x] Create the project file structure: `index.html`, `style.css`, `app.js`. *(Migrated to Next.js/React)*
- [x] Design the HTML structure for all input elements:
  - [x] Month and year selection (dropdown or date picker).
  - [x] Public holidays input (e.g., `<textarea>`).
  - [x] Special date configurations input (date picker + staffing numbers).
  - [x] Global configuration inputs (max night, max leave).
  - [x] A dynamic area to add/remove personnel.
  - [x] For each personnel row: name input, role selection, leave request inputs.
- [x] Create the main control buttons: **"Generate Schedule"** and **"Reset Data"**. *(Reset not yet implemented)*
- [x] Design the output area with tabs for "Calendar View" and "Statistics".

### ✅ **Phase 2: Data Management & Local Storage**
- [x] Create a `saveDataToLocalStorage()` function to store all user inputs.
- [x] Create a `loadDataFromLocalStorage()` function to run on page load.
- [x] Bind each input element to automatically save its value on change.

### ✅ **Phase 3: Core Scheduling Logic (in `app.js`)**
- [x] Create the main `generateSchedule()` function triggered by the button.
- [x] **Preprocessing**:
  - [x] Initialize an empty schedule structure for every day in the selected month.
  - [x] Apply all requested leaves (L, LT, CT) to the schedule as hard constraints.
  - [x] Apply special date configurations to override default staffing rules.
- [x] **Solver/Generator Algorithm**:
  - [x] Iterate day by day, from the start date to the end date.
  - [x] For each day, fill the shift slots (P, S, M) according to daily requirements.
  - [x] Create a `findAvailableStaff(date, shiftType)` function that finds staff who can fill a slot.
  - [x] Inside `findAvailableStaff`, implement all validation functions:
    - [x] `isValidSequence(staff, date, shiftType)`: Checks shift sequence rules (M->M/L, etc.).
    - [x] `isWithinNightLimit(staff)`: Checks the max night shift quota.
    - [x] `isWithinLeaveLimit(staff)`: Checks the max default leave quota.
    - [x] `isNotOnLeave(staff, date)`: Ensures the staff member is not already on leave.
    - [x] `isWithinMaxConsecutiveWork(staff, date)`: Checks the max 5 consecutive workdays rule.
- [x] **Priority Implementation**:
  - [x] When filling a **Morning (P)** shift on a weekday, first call `findAvailableStaff` for the `shift` role.
  - [x] If no one is found, then call `findAvailableStaff` for the `non_shift` role.
- [x] **Error Handling**:
  - [x] If at any point `findAvailableStaff` cannot find a person for a mandatory slot, halt the process.
  - [x] Return a detailed error message specifying which rule was violated, which date caused the issue, and what specific constraint could not be met.

### ✅ **Phase 4: Output Visualization**
- [x] Create a `renderCalendarView(scheduleData)` function to draw the calendar table in HTML.
- [x] Create a `renderStatsView(scheduleData)` function to calculate and display the stats for each person.
- [x] Call these functions after a schedule is successfully generated.
- [x] Create a function to display detailed error messages in the UI if the generator fails, showing specific rule violations and problematic dates.

### ⏳ **Phase 5: Finalization & Testing**
- [ ] Connect all functions into a coherent workflow.
- [ ] Test with various scenarios:
  - [ ] Sufficient staff.
  - [ ] Insufficient staff (to test error handling).
  - [ ] Many conflicting leave requests.
- [x] Add some basic styling (CSS) to make the application user-friendly.
- [ ] Write comments in the code to explain complex parts.