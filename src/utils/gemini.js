import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function triageAgent(rawText, onThought) {
  const prompt = `You are an emergency triage agent for a smart city dispatch system in India.
Analyze this emergency call and respond ONLY with valid JSON, nothing else.
The call may be in Hindi, Hinglish, or English.

Call text: "${rawText}"

Respond with this exact JSON structure:
{
  "severity": <number 1-5, 5 being most critical>,
  "locationHint": "<extracted location if mentioned>",
  "resourcesNeeded": ["ambulance" and/or "fire_truck" and/or "police"],
  "isDuplicate": false,
  "summary": "<one line summary in English>",
  "thinking": "<your reasoning process, 2-3 sentences>"
}`;

  const result = await model.generateContentStream(prompt);
  let fullText = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    if (onThought) onThought(fullText);
  }
  try {
    const clean = fullText.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { severity: 3, resourcesNeeded: ["ambulance"], isDuplicate: false, summary: rawText, thinking: fullText };
  }
}

export async function dispatchAgent(incident, availableResources, onThought) {
  const prompt = `You are an emergency dispatch agent for Delhi NCR.
Choose the best available resources for this incident and respond ONLY with valid JSON.

Incident: ${JSON.stringify(incident)}
Available resources: ${JSON.stringify(availableResources)}

Respond with this exact JSON structure:
{
  "assignedResources": ["<resource IDs>"],
  "estimatedETA": <number in minutes>,
  "route": "<brief route description>",
  "thinking": "<your dispatch reasoning, 2-3 sentences>"
}`;

  const result = await model.generateContentStream(prompt);
  let fullText = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    if (onThought) onThought(fullText);
  }
  try {
    const clean = fullText.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { assignedResources: [], estimatedETA: 5, route: "Direct route", thinking: fullText };
  }
}

export async function coordinatorAgent(incident, dispatch, onThought) {
  const prompt = `You are the coordinator agent confirming emergency dispatch in Delhi.
Generate confirmation details and respond ONLY with valid JSON.

Incident: ${JSON.stringify(incident)}
Dispatch result: ${JSON.stringify(dispatch)}

Respond with this exact JSON structure:
{
  "smsText": "<SMS to send to nearby citizens, max 100 chars>",
  "statusUpdate": "<status update for the operator>",
  "zoneAlert": "<any zone capacity warnings>",
  "thinking": "<your coordination thoughts, 2-3 sentences>"
}`;

  const result = await model.generateContentStream(prompt);
  let fullText = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    if (onThought) onThought(fullText);
  }
  try {
    const clean = fullText.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { smsText: "Emergency services dispatched.", statusUpdate: "Confirmed", zoneAlert: "", thinking: fullText };
  }
}