# 🚀 Quick Start Guide

## Step 1: Set up Environment Variables

Create a `.env` file in the **project root** (not in lab_3_Chat_Bot):

```bash
OPENROUTER_API_KEY=your-openrouter-api-key-here
PORT=3001
```

Get your OpenRouter API key from: https://openrouter.ai/

## Step 2: Start the Backend Server

Open a terminal and run:

```bash
npm run chatbot:server
```

You should see:
```
🚀 Travel Planner API server running on http://localhost:3001
📍 API endpoint: http://localhost:3001/api/chat
```

## Step 3: Start the Frontend

Open a **new terminal** and run:

```bash
npm run chatbot:client
```

The React app will open automatically in your browser at `http://localhost:5173`

## Step 4: Start Chatting!

1. Fill in the optional trip details (departure, destination, style, budget, interests)
2. Type your message in the chat input
3. Click "Send" or press Enter
4. Wait for the AI to generate your personalized travel itinerary!

## Example Messages to Try

- "Plan a 3-day trip to Tokyo"
- "I want to visit Paris on a budget"
- "Suggest a romantic getaway to Santorini"
- "Create an adventure-filled itinerary for New Zealand"

## Troubleshooting

### Backend won't start
- Check that your `.env` file exists in the project root
- Verify your OpenRouter API key is valid
- Make sure port 3001 is not already in use

### Frontend won't connect
- Ensure the backend server is running first
- Check that the backend is on port 3001
- Look for CORS errors in the browser console

### No AI responses
- Verify your OpenRouter API key has credits
- Check the backend terminal for error messages
- Try a simpler message first

## Need Help?

Check the full README.md for detailed documentation and customization options.