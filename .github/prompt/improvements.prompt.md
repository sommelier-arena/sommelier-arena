# Project Goal

The primary goal is to enhance the Sommelier Arena application, a web-based wine tasting game. The application should be deployable to a live environment for free, allowing users to play with friends. One user acts as the host, setting up a session in advance and sharing a session code with participants.

This plan outlines the required features, improvements, documentation updates, and deployment requirements to move from a local-only MVP to a shareable, more robust application.

# Core Gameplay Enhancements

### 1. Pre-defined Answer Options
For certain questions, provide default, autocompleted answers. The host should be able to override these defaults.

-   **Question**: "What is the color of this wine?"
    -   **Default Answers**: A. Rouge, B. Blanc, C. Rosé, D. Orange.

-   **Question**: "Which country or region might this wine come from?" (Update from "What is the country of origin of this wine?")
    -   **Default Answers**: A. Bordeaux (France), B. Burgundy (France), C. Loire Valley (France), D. Tuscany (Italy).

-   **Question**: "What is the vintage year of this wine?"
    -   **Default Answers**: A. 2015, B. 2016, C. 2017, D. 2018.

-   **New Question**: "What is the name of the wine?"
    -   **Default Answers**: A. Château Margaux, B. Domaine de la Romanée-Conti, C. Château Lafite Rothschild, D. Château Latour.

### 2. Randomize Question and Answer Order
-   **Current State**: The correct answer is always option A.
-   **Requirement**: The order of answers for each question should be randomized for participants to ensure fairness.

### 3. Persistent Scores and Leaderboard
-   **Current State**: Scores and the leaderboard reset after each round.
-   **Requirement**: Scores and the leaderboard must persist across all rounds within a session, allowing participants to track their cumulative progress.

### 4. Participant Session Persistence
-   **Current State**: Participants lose all progress if they refresh or close their browser.
-   **Requirement**: Implement session management (e.g., using local storage or cookies) to retain a participant's state (name, score, progress) if they disconnect and reconnect to the same session.

### 5. Flexible Answer Submission
-   **Current State**: An answer is final once selected.
-   **Requirement**: Allow participants to change their selected answer at any time before the timer for the current question runs out.

# New Host Features

### 1. Configurable Timer
-   **Requirement**: As a host, I want to set the duration for the question timer before starting a session. This allows me to control the game's pace.

### 2. Session Management
-   **Requirement**: As a host, I need to be able to create and manage multiple game sessions.
-   **Details**:
    -   A host should see a list of all sessions they have created.
    -   The list should display session details (e.g., name, creation date, number of participants, final leaderboard).
    -   The host should have the ability to delete old or unwanted sessions.

# New Participant Features

### 1. Post-Session Summary and Replay
-   **Requirement**: After a session ends, participants should see a performance summary.
-   **Details**:
    -   The summary should include their final score, rank, and a list of questions with their answers marked as correct or incorrect.
    -   Add a "Play Again" button that allows them to easily join a new session.

# Documentation and Terminology

### 1. Create a Glossary
-   **Requirement**: Add a glossary to the documentation site.
-   **Content**: Define key terms used in the app (e.g., Session, Round, Question, Answer, Score, Leaderboard) to help new users.

### 2. Standardize Terminology
-   **Requirement**: Use consistent terminology throughout the application UI, backend code, and documentation.
-   **Decision**: Standardize on the term **"session"** instead of "quiz".

### 3. Update README.md
-   **Requirement**: Revise the main `README.md` file to provide a comprehensive and up-to-date overview of the project, its features, and instructions for local setup and usage.

# Deployment and Infrastructure

### 1. Hosting Environment
-   **Requirement**: The application must be deployable to a live, public URL.
-   **Constraint**: The hosting solution must be **100% free**.
-   **Target URL**: `sommelier-arena.ducatillon.net` (DNS is managed via Cloudflare).
-   **Suggested Providers**: Vercel, Netlify, Cloudflare Pages, or other free-tier services.

### 2. Local Development
-   **Requirement**: It must remain possible to run the entire application stack locally for development and beta testing.
-   **Constraint**: Use Docker and `docker-compose.yml` for local setup.

### 3. Environment Management
-   **Requirement**: Provide clear explanations and scripts for managing differences between the **local (development)** and **production** environments (e.g., environment variables for API endpoints, database connections).
