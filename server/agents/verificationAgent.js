function verificationAgent(data, rawText) {
  console.log("Verification Agent scoring...");
  
  let trustScore = 0.5;
  const lowerText = (rawText || "").toLowerCase();

  const urgencyKeywords = ['jaldi', 'help', 'emergency', 'bachao', 'fast', 'quick'];
  const severityKeywords = ['fire', 'blood', 'unconscious', 'accident', 'heart', 'attack'];

  const urgencyMatches = urgencyKeywords.filter(k => lowerText.includes(k)).length;
  const severityMatches = severityKeywords.filter(k => lowerText.includes(k)).length;

  if (urgencyMatches > 0) trustScore += 0.2;
  if (severityMatches > 0) trustScore += 0.2;

  // Additional boost if LLM flagged severity high
  if (data.severity >= 4) trustScore += 0.1;

  // Cap at 1.0
  trustScore = Math.min(1.0, trustScore);

  let priority = "LOW";
  if (trustScore >= 0.7 && data.severity >= 4) priority = "CRITICAL";
  else if (trustScore >= 0.5 && data.severity >= 3) priority = "HIGH";
  else if (data.severity >= 2) priority = "MEDIUM";

  return {
    trustScore: parseFloat(trustScore.toFixed(2)),
    priority,
    verificationThinking: `Verification logic applied. Trust score calculated as ${trustScore.toFixed(2)}.`
  };
}

module.exports = { verificationAgent };
