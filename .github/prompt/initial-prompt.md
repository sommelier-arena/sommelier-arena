# Sommelier Arena MVP 

Build the app  Sommelier Arena MVP (like https://kahoot.it/) that I will use with dozens of friends to play blind tests with wine glasses.
For every glass of wine each participant is invited to answer a few questions like:
- color of the wine: white, red, etc
- country: france, south africa, italy etc. ()
- region : sud ouest, bourgone, bordeaux, sud etc. (list of options depends on the country selected by the participant's answer!)
- year : the year corresponding to the wine we are drinking and 3 other fake year.
- name : name of the real wine we are drinnking + 3 fake answers.
A friend within the group is the considered as the "host":  from the app he can setup the list of wines he will propose to us so he needs a ui to setup the list of wines with corresponding details (the "good" answers")
We are used to play this game but what happens every time is that as the first of us  says somthing about the wine, it directly influences the others.
What is funny with this game is that both expert and newbee can make mistakes about the wine origin.

The core user flow should be: host creates a session, participants join with a code, they wait in a lobby, host starts the session, participants answer questions in real-time, and results display on a leaderboard.

## Beta-test flow

### As a Host

1. Go to **http://localhost:3000** → click **Create a wine test**
2. Enter a wine test title → click **Create wine test**
3. Set up the wine test by adding wines and questions (4 questions per wine to guess) 
3.1 For each wine, enter the correct answer and 3 fake answers for each question
3.2 Click **Save wine** to add the wine to the test
3.3 Once all wines are added, click **Finish setup** to create the session and go to the Host Dashboard
4. In the Host Dashboard, click **Start wine test** to open the lobby and get the join code
5. Share the join code with participants

### As a Participant

1. Go to **http://localhost:3000/join**
2. Enter the 4-digit join code → enter your name (or get a default pseudonym like crazy-naked-cat) → click **Join**
3. You are redirected to the **Lobby** to wait for the host

### Running a round

1. Host clicks **Start** to put the wine test in `running` state
3. Participants can now see the first question, select an answer, and click **Submit**
4. Once all participants answered or the timer runs out, the host clicks **Next** to show the correct answer and update the leaderboard
5. Participants can see their score and the correct answer, but not who got it right or wrong
6. Host clicks **Next** to start the next round, and so on until the end of the test
7. After the last round, the final leaderboard is displayed with the winners 🎉
8. Host can click **End session** to close the test and return to the dashboard

### Viewing the leaderboard

Go to the dashboard page of the session (e.g. http://localhost:3000/session/abc123) to see the current leaderboard with participant scores and rankings. The leaderboard updates in real-time after each round.

# Tech Stack

A git mono repo with this folder hierarchy

- back/
hostes the nestjs backend with dockerfile and docker-compose
- front/
stores the Astro (+React Components) framework.
dockerfile included and docker-compose
- docs/
stores a docusaurus doc static site
dockerfile included and docker-compose
- docker-compose file at the root of the project to let the developer (me) run the fullstack app locally. This will also be used probably for production.
- .env.example
- .env

Pick a postgres database if neede and what's best for websocket if needed.

For the MVP let's dont do the mistake of overengineering. Maybe localstorage or zustand state management is enough for the functional needs of this MVP.


It's really for a group of 10 friends not a company web app with stron restrictions.

# What I want

Help me describe the functionnal specs of the app. We will do it in a dedicated PRD.md file
This PRD.md file will import/link other md. file from the docusaurus content like:
- Overview.md
- Features.md
- User-Stories.md
- Tech-Stack.md (Core Principles
Separation of Concerns: Distinct layers with clear responsibilities.
Dependency Inversion with the nestjs backend
Testability: Business rules are decoupled from infrastructure, making them easy to test.)
- Database-model.md (Need a Persistence-oriented Entity-Relationship Diagram (mermaid diagram))
- Architecture.md (tree view of the app architecture)
- Quick-start.md (guide to help set up and full stack app, gives a fast overview of the core concepts)

The idea is that the PRD.md file is the main file but if I needed to update anything I will update the linked .md file so the PRD.md file stays always up to date.

SO know ask me questions to describes clearly the functional specs so that I will be able to plan the implementation of the app with copilot.