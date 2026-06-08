# 45600_2_Agentic_AI_Development

### Gal amouyal email:

galamouyal88@gmail.com

## Lectures:

- https://gamma.app/docs/AI-Agents-hlgj38btkim0stw?mode=present#card-a5abmjga0u18ily

- https://gamma.app/docs/MCP-vs-Skills-ajmej0v6tyu3yde

## Prerequisites

Install the following tools before working on this project.

### Cursor

AI-powered code editor used for agentic development in this course.

- Download: [https://cursor.com](https://cursor.com)
- Install the app for your OS (macOS, Windows, or Linux)
- Sign in and complete setup when you first open Cursor

### Node.js

JavaScript runtime for running scripts, package managers, and local dev servers.

- Download: [https://nodejs.org](https://nodejs.org) (LTS recommended)
- Or use a version manager:
  - **macOS/Linux:** [nvm](https://github.com/nvm-sh/nvm)
  - **Windows:** [nvm-windows](https://github.com/coreybutler/nvm-windows)
- Verify:

```bash
node --version
npm --version
```

### Docker

Container platform for running services and reproducible environments.

- Download: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- Install **Docker Desktop** (macOS/Windows) or **Docker Engine** (Linux)
- Start Docker Desktop (or the Docker daemon) before using containers
- Verify:

```bash
docker --version
docker compose version
```

### Git

Version control for cloning repos, branches, and commits.

- Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- macOS: often pre-installed; upgrade via Homebrew: `brew install git`
- Verify:

```bash
git --version
```

# 1/6/2026

## Ex_1

1. Create HTML CSS JS Project.
2. Use the JSON file companies.JSON
3. Create statistics page with at least 2 charts reports.
4. Make sure to support theme and filters

prompt:

```
What i want you to do?  high level?
Business needs.
how to threat to the prompt? ( AS UI developer/ backend expert )

Functionalities - Business logic ( steps - theme )

constraints ( libs, language )

--detailed functionalities
examples: how input should be look like?
charts aggregations reports
piechart, bar chart line chart
output - orgnized structure ( seperate files, JSON)
```

## Ex_2

1. Create script which increase the number of companies to 1000
2. Use Random values

# Langchain doc - https://docs.langchain.com/oss/javascript/langchain/overview

### Homework

- Lunch Lab_3
- Create API key with openrouter
- Use the new Key with the relevant environment variable file .env:

```js
# Get your key at https://openrouter.ai/keys

OPENROUTER_API_KEY=sk-......

# LangChain model string (provider:model). Default: openrouter:gpt-5.4

OPENROUTER_MODEL=openrouter:gpt-5.4

```

- Support an extra functionality - Options to generate the story

1. Scary story, Happy story
2. Good end, Bad end
3. Short - current configuration, Long 7 senteces ( increased size )

# npm run agent -- --title "Midnight Paws" --mood scary --lines 8 "a cat in an old attic"

# 4/6/2026

## Ex_1

- Support new input paramter in the UI - creativity - High / Med / Low ( default Med)
- support the model temperature according to High 0.9, Med 0.5 and Low 0.1
- Test the responses across results - use the same subject to measure it

## Homework

- Try to support another UI capability.
- The UI will expose a Chatbot to help writing the story
- IMPORTANT - you must extract the information based on the user prompt.
- Support defualt if the user didnt mentioned in the text the relevant information
- block if no subject.

# 8/6/2026

# Ex_1

- Add more tools to lab_5
- tool1 - support showing the source and destination country on map
- tool2 - show the flag of the counry on the map
  hints: langtitute, lattitude,
  api: https://restcountries.com/v3.1/name/isr
  geo-code: https://geocoding-api.open-meteo.com/v1/search

  ## Homework
  1. try to reduce the number of iterations when calling the tool - convert currency
  2. Extend capabilities to show the flight number + flight hour
