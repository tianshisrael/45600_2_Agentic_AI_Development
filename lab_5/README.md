# Lab 3 – Travel Planner Chat Bot

A full-stack AI-powered travel planning chat bot with a React frontend and Express.js backend, using LangChain and OpenRouter.

## 🏗️ Architecture

```
lab_3_Chat_Bot/
├── server.js          # Express API server
├── agent.js           # Original LangChain agent (reference)
├── client/            # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx    # Main chat UI component
│   │   ├── App.css    # Styling
│   │   └── main.jsx   # Entry point
│   └── package.json
└── README.md
```

## 🚀 Features

- **Interactive Chat Interface**: Beautiful, responsive chat UI built with React
- **Travel Planning Form**: Optional form fields for departure, destination, style, budget, and interests
- **Real-time AI Responses**: Powered by Mistral-7B via OpenRouter
- **RESTful API**: Express.js backend with CORS support
- **Flexible Input**: Can use structured form data or free-form chat messages

## 📋 Prerequisites

- Node.js 18+ (for native `fetch` and ES modules)
- OpenRouter API key ([Get one here](https://openrouter.ai/))

## 🔧 Setup

### 1. Install Backend Dependencies

From the project root:

```bash
npm install
```

This installs:

- `@langchain/openai`
- `@langchain/core`
- `dotenv`
- `express`
- `cors`

### 2. Install Frontend Dependencies

```bash
cd lab_3_Chat_Bot/client
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the **project root** (not in lab_3_Chat_Bot):

```bash
OPENROUTER_API_KEY=your-key-here
PORT=3001
```

## 🎯 Running the Application

### Start the Backend Server

From the project root:

```bash
node lab_3_Chat_Bot/server.js
```

The API server will start on `http://localhost:3001`

### Start the Frontend Development Server

In a new terminal, from the project root:

```bash
cd lab_3_Chat_Bot/client
npm run dev
```

The React app will start on `http://localhost:5173` (or another port if 5173 is busy)

## 🌐 API Endpoints

### POST `/api/chat`

Send a chat message to the travel planner agent.

**Request Body:**

```json
{
  "message": "Plan a trip to Paris",
  "departure": "New York",
  "destination": "Paris",
  "style": "romantic, cultural",
  "budget": "medium",
  "interests": "museums, cafes, architecture"
}
```

**Response:**

```json
{
  "success": true,
  "response": "Here's your 3-day Paris itinerary..."
}
```

### GET `/api/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "message": "Travel Planner API is running"
}
```

## 💡 Usage

1. **Open the app** in your browser (usually `http://localhost:5173`)
2. **Fill in trip details** (optional):
   - Departure City
   - Destination City
   - Travel Style
   - Budget Level
   - Special Interests
3. **Type your message** in the chat input
4. **Click Send** or press Enter
5. **Wait for the AI response** with your personalized itinerary

## 🎨 Customization

### Modify the AI Model

Edit `server.js`:

```javascript
const model = new ChatOpenAI({
  model: "mistralai/mistral-7b-instruct", // Change to any OpenRouter model
  temperature: 0.2, // Adjust creativity (0.0 - 1.0)
  // ...
});
```

### Customize the System Prompt

Edit the system message in `server.js`:

```javascript
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Your custom system prompt here..."],
  ["human", "{message}"],
]);
```

### Modify the UI

Edit `client/src/App.jsx` and `client/src/App.css` to customize the look and feel.

## 🐛 Troubleshooting

### CORS Errors

Make sure the backend server is running and CORS is properly configured in `server.js`.

### API Key Issues

Verify your `.env` file is in the project root and contains a valid `OPENROUTER_API_KEY`.

### Port Conflicts

If port 3001 or 5173 is already in use, you can change them:

- Backend: Set `PORT` in `.env`
- Frontend: Vite will automatically use the next available port

### Connection Refused

Ensure both the backend and frontend servers are running in separate terminals.

## 📚 Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Node.js, Express.js
- **AI**: LangChain, OpenRouter (Mistral-7B)
- **Styling**: Custom CSS with gradients and animations

## 🔮 Future Enhancements

- [ ] Add conversation history persistence
- [ ] Implement streaming responses
- [ ] Add user authentication
- [ ] Save favorite itineraries
- [ ] Export itineraries to PDF
- [ ] Multi-language support
- [ ] Image generation for destinations

## 📝 License

MIT

# How to Run the project

1. run `npm install` in the folders `Agentic_AI_2026/lab_3_Chat_Bot/client` and `Agentic_AI_2026/lab_3_Chat_Bot`
2. run `npm run dev` in the folder `Agentic_AI_2026/lab_3_Chat_Bot`
3. Open browser in `http://localhost:5173`
