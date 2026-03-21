---
id: architecture
title: "Architecture (tree view)"
---

# Architecture (tree view)

- back/ (NestJS)
  - src/
  - Dockerfile
  - docker-compose.yml (service definition)
- front/ (Astro + React)
  - src/components/
  - Dockerfile
- docs/ (Docusaurus)
- docker-compose.yml (root orchestrates back, front, docs)
- .env.example

Runtime: frontend connects to backend via Socket.IO; backend routes messages to session rooms.
