---
title: 'Collection of answers for Wines'
---

# Context

The tasting creation as a host must be fluid, easy and rapid process.
Right now there are too many manual edits for every wine.
Plus, a host with a low level of knwoledge about wine will have difficulties to "imagine" fun and good distractors.
Let's make the tasting creation process more fun and realistic.

# Description

This issue is about the implementation of persistence on the Answers for wines questions.

# Technical details

The current implementation of correct answers and distractors is in this file:
/Users/mac-FDUCAT18/Workspace/FDUCAT/SommelierArena/front/src/components/host/SessionForm.tsx

What about using CloudFlare KV to enable persistence on this data ?

Something like:

|key|value|
|-|-|
|color|Rouge,Blanc,Rosé,Orange|
|Region|Bordeaux(France),Bourgogne(France),Provence(France),Toscane(Italy),Veneto(Italy) etc|
|grape_variety|Pinot Noir,Syrah,Merlot,Cabernet Sauvignon,Chardonnay etc.|
|vintage_year|2015,2016,2017,2018,2019,2020,2021,2022|
|wine_name|Château Margaux, Châteaux Petrus, Château Lâtour, Château Lafite etc.|

# Implementation details

This would be great for the content of keys, and above all the values, to fetch relevant data from what's available on the web.
This ambition is to be the "database reference" for wine. We would list all wine regions, all wine names, all wine grape varieties etc.

This wine data fetch process could be a process to run from time to time to retrieve the relevant and up to date data. (though a command line or script or whatever suits the job)

In parallel, this issue is about managing the database reference from an admin dashboard/page (/Users/mac-FDUCAT18/Workspace/FDUCAT/SommelierArena/.github/issues/feat/wine-answers-admin-dashboard.md)
