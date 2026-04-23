# KAVACH — Smart City Dispatch

KAVACH is an intelligent, real-time emergency response and dispatch system designed specifically for Indian cities. It utilizes the power of LLMs to analyze incoming emergency requests (in Hindi, Hinglish, or English), automatically triage the severity, intelligently assign nearest available resources (Ambulances, Fire Trucks, Police), and coordinate the dispatch flow to minimize response time.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **AI/Backend**: Google Gemini 1.5 Flash
- **APIs**: Web Speech API (for voice input)
- **Routing**: React Router DOM

## How to Run Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file in the root of the project and add your Gemini API Key:
   ```env
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

## Application URLs

Once the development server is running, the application exposes two distinct views for the demo:

- **Citizen Mobile App**: [http://localhost:5173/](http://localhost:5173/)
- **Manager Dashboard**: [http://localhost:5173/manager](http://localhost:5173/manager)

You can easily switch between these views using the small navigation buttons built into the corners of the application.
