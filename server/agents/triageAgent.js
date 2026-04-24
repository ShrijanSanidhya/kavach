const { GoogleGenerativeAI } = require("@google/generative-ai");

async function triageAgent(message) {
  console.log("Triage Agent analyzing...");
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an emergency triage agent in India.
Analyze this emergency call. Respond ONLY with valid JSON.
Call: "${message}"
JSON format:
{
  "type": "<type of emergency>",
  "severity": <1-5>,
  "location": "<location if mentioned>",
  "resources": ["ambulance" or "fire_truck" or "police"],
  "summary": "<one line English summary>",
  "thinking": "<your reasoning 2-3 sentences>"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Triage SDK error:", err);
    return {
      type: "Unknown",
      severity: 3,
      location: "Unknown",
      resources: ["ambulance"],
      summary: "Error processing report",
      thinking: "Fallback triggered due to processing error."
    };
  }
}

module.exports = { triageAgent };
