export async function triageAgent(rawText, onThought) {
  try {
    const response = await fetch("http://localhost:5000/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: rawText })
    });
    
    if (!response.ok) throw new Error("Backend error");
    const data = await response.json();
    
    // Simulate "thought" for the UI since it expects a stream or text
    if (onThought) onThought(data.thinking || "Analyzing emergency...");
    
    return data;
  } catch (err) {
    console.error("Triage error:", err);
    if (onThought) onThought('Analyzing emergency call...');
    return { severity: 3, resourcesNeeded: ['ambulance'], 
             isDuplicate: false, summary: rawText, 
             thinking: 'Emergency detected.' };
  }
}

export async function dispatchAgent(incident, availableResources, onThought) {
  try {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an emergency dispatch agent for Delhi NCR.
Choose the best available resources for this incident and respond ONLY with valid JSON.

Incident: ${JSON.stringify(incident)}
Available resources: ${JSON.stringify(availableResources)}

Respond with this exact JSON structure:
{
  "assignedResources": ["<resource IDs>"],
  "estimatedETA": <number in minutes>,
  "route": "<brief route description>",
  "thinking": "<your dispatch reasoning, 2-3 sentences>"
}`
            }]
          }]
        })
      }
    );
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text;
    if (onThought) onThought(text);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Dispatch error:', err);
    if (onThought) onThought('Finding nearest resources...');
    return { assignedResources: [], estimatedETA: 5, route: "Direct route", thinking: "Dispatching resources." };
  }
}

export async function coordinatorAgent(incident, dispatch, onThought) {
  try {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the coordinator agent confirming emergency dispatch in Delhi.
Generate confirmation details and respond ONLY with valid JSON.

Incident: ${JSON.stringify(incident)}
Dispatch result: ${JSON.stringify(dispatch)}

Respond with this exact JSON structure:
{
  "smsText": "<SMS to send to nearby citizens, max 100 chars>",
  "statusUpdate": "<status update for the operator>",
  "zoneAlert": "<any zone capacity warnings>",
  "thinking": "<your coordination thoughts, 2-3 sentences>"
}`
            }]
          }]
        })
      }
    );
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text;
    if (onThought) onThought(text);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Coordinator error:', err);
    if (onThought) onThought('Confirming routes...');
    return { smsText: "Emergency services dispatched.", statusUpdate: "Confirmed", zoneAlert: "", thinking: "Coordination complete." };
  }
}