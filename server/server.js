const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { triageAgent } = require('./agents/triageAgent');
const { verificationAgent } = require('./agents/verificationAgent');
const { dispatchAgent } = require('./agents/dispatchAgent');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "KAVACH backend running" });
});

app.post('/api/triage', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    // 1. Triage
    const triageResult = await triageAgent(message);
    
    // 2. Verification
    const verificationResult = verificationAgent(triageResult, message);
    
    // 3. Dispatch
    const dispatchData = { ...triageResult, ...verificationResult };
    const dispatchResult = dispatchAgent(dispatchData);
    
    // Combine results
    const finalResponse = {
      ...triageResult,
      ...verificationResult,
      ...dispatchResult,
    };

    res.json(finalResponse);
  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
