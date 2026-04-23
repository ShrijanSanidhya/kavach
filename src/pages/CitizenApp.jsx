import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Loader2, MapPin, Ambulance, Navigation } from "lucide-react";
import { startListening } from "../utils/speechRecognition";
import { triageAgent, dispatchAgent, coordinatorAgent } from "../utils/gemini";
import { mockResources } from "../data/mockResources";

export default function CitizenApp() {
  const [screen, setScreen] = useState("report"); // report, processing, tracking
  
  // Report Screen State
  const [language, setLanguage] = useState("hi-IN");
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Processing Screen State
  const [activeAgent, setActiveAgent] = useState(null);
  const [triageThought, setTriageThought] = useState("");
  const [dispatchThought, setDispatchThought] = useState("");
  const [coordThought, setCoordThought] = useState("");

  // Tracking Screen State
  const [trackingData, setTrackingData] = useState(null);
  const [dotPos, setDotPos] = useState({ x: 10, y: 10 });

  // --- Report Actions ---
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setLiveTranscript("");
      setIsListening(true);
      recognitionRef.current = startListening(
        (transcript, isFinal) => {
          setLiveTranscript(transcript);
          if (isFinal) {
            setInputText((prev) => (prev ? prev + " " + transcript : transcript));
            setLiveTranscript("");
            setIsListening(false);
          }
        },
        () => setIsListening(false),
        language
      );
    }
  };

  const handleSubmit = async () => {
    const finalQuery = inputText || liveTranscript;
    if (!finalQuery.trim()) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setScreen("processing");
    
    // Step 1: Triage
    setActiveAgent("triage");
    const incidentData = await triageAgent(finalQuery, (text) => setTriageThought(text));
    
    // Step 2: Dispatch
    setActiveAgent("dispatch");
    const availableResources = {
      ambulances: mockResources.ambulances.filter(r => r.status === "available"),
      fireTrucks: mockResources.fireTrucks.filter(r => r.status === "available"),
      police: mockResources.police.filter(r => r.status === "available"),
    };
    const dispatchData = await dispatchAgent(incidentData, availableResources, (text) => setDispatchThought(text));
    
    // Step 3: Coordinator
    setActiveAgent("coordinator");
    const coordData = await coordinatorAgent(incidentData, dispatchData, (text) => setCoordThought(text));

    // Finish
    setActiveAgent("done");
    setTrackingData({
      incidentId: "INC-" + Math.floor(100 + Math.random() * 900),
      eta: dispatchData.estimatedETA || 4,
      assignedResources: dispatchData.assignedResources || ["AMB-01"],
    });
    setScreen("tracking");
  };

  // --- Map Animation ---
  useEffect(() => {
    if (screen === "tracking") {
      const interval = setInterval(() => {
        setDotPos(prev => ({
          x: prev.x < 90 ? prev.x + 2 : 90,
          y: prev.y < 90 ? prev.y + 1 : 90
        }));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#05080F] text-white flex flex-col items-center w-full relative overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="w-full max-w-md p-6 text-center z-10">
        <h1 className="text-3xl font-black tracking-widest text-cyan-400">KAVACH</h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Emergency Response System</p>
      </div>

      {/* ===================== SCREEN 1: REPORT ===================== */}
      {screen === "report" && (
        <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center p-6 space-y-8 z-10">
          
          <div className="flex flex-col items-center">
            <button
              onClick={toggleListening}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                isListening 
                  ? "bg-red-500 animate-pulse shadow-red-500/50 scale-110" 
                  : "bg-red-600/20 hover:bg-red-600/40 border border-red-500/30"
              }`}
            >
              {isListening ? <Mic className="w-12 h-12 text-white" /> : <MicOff className="w-12 h-12 text-red-400" />}
            </button>
            <h2 className="mt-8 text-xl font-bold tracking-wide">TAP & SPEAK YOUR EMERGENCY</h2>
            <p className="text-gray-500 text-sm mt-2">Hindi ya English mein boliye</p>
          </div>

          {(liveTranscript || inputText) && (
            <div className="w-full bg-white/5 p-4 rounded-xl border border-white/10 min-h-[60px] text-center italic text-gray-300">
              {inputText} {liveTranscript}
            </div>
          )}

          <div className="w-full flex items-center gap-4 text-gray-600">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs font-bold tracking-widest">OR</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <div className="w-full space-y-4">
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={3}
              placeholder="Type your emergency here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setLanguage("hi-IN")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${language === "hi-IN" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-gray-400 border border-white/10"}`}
              >
                हिंदी
              </button>
              <button 
                onClick={() => setLanguage("en-US")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${language === "en-US" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-gray-400 border border-white/10"}`}
              >
                English
              </button>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl font-bold text-lg tracking-wider transition-all shadow-lg shadow-red-600/30 flex justify-center items-center gap-2"
          >
            REPORT EMERGENCY <Send className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ===================== SCREEN 2: PROCESSING ===================== */}
      {screen === "processing" && (
        <div className="flex-1 w-full max-w-md p-6 flex flex-col justify-center space-y-4 z-10">
          
          {/* Triage Agent */}
          <div className={`p-4 rounded-xl border transition-all duration-500 ${activeAgent === "triage" ? "bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-white/5 border-white/10 opacity-70"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-red-500 ${activeAgent === "triage" ? "animate-pulse" : ""}`}></div>
                <h3 className="font-bold text-red-400">Agent 1: Triage</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-white/10 rounded-full">{triageThought ? "Done" : (activeAgent === "triage" ? "Processing" : "Waiting")}</span>
            </div>
            <p className="text-sm text-gray-300 italic min-h-[40px] break-words">
              {triageThought || (activeAgent === "triage" ? "Analyzing emergency..." : "...")}
              {activeAgent === "triage" && <span className="inline-block w-1 h-4 ml-1 bg-red-400 animate-pulse"></span>}
            </p>
          </div>

          {/* Dispatch Agent */}
          <div className={`p-4 rounded-xl border transition-all duration-500 ${activeAgent === "dispatch" ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "bg-white/5 border-white/10 opacity-70"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-amber-500 ${activeAgent === "dispatch" ? "animate-pulse" : ""}`}></div>
                <h3 className="font-bold text-amber-400">Agent 2: Dispatch</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-white/10 rounded-full">{(activeAgent === "coordinator" || activeAgent === "done") ? "Done" : (activeAgent === "dispatch" ? "Processing" : "Waiting")}</span>
            </div>
            <p className="text-sm text-gray-300 italic min-h-[40px] break-words">
              {dispatchThought || (activeAgent === "dispatch" ? "Finding nearest resources..." : "...")}
              {activeAgent === "dispatch" && <span className="inline-block w-1 h-4 ml-1 bg-amber-400 animate-pulse"></span>}
            </p>
          </div>

          {/* Coordinator Agent */}
          <div className={`p-4 rounded-xl border transition-all duration-500 ${activeAgent === "coordinator" ? "bg-teal-500/10 border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.2)]" : "bg-white/5 border-white/10 opacity-70"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-teal-500 ${activeAgent === "coordinator" ? "animate-pulse" : ""}`}></div>
                <h3 className="font-bold text-teal-400">Agent 3: Coordinator</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-white/10 rounded-full">{activeAgent === "done" ? "Done" : (activeAgent === "coordinator" ? "Processing" : "Waiting")}</span>
            </div>
            <p className="text-sm text-gray-300 italic min-h-[40px] break-words">
              {coordThought || (activeAgent === "coordinator" ? "Confirming routes..." : "...")}
              {activeAgent === "coordinator" && <span className="inline-block w-1 h-4 ml-1 bg-teal-400 animate-pulse"></span>}
            </p>
          </div>
          
          <div className="flex justify-center mt-8">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        </div>
      )}

      {/* ===================== SCREEN 3: TRACKING ===================== */}
      {screen === "tracking" && trackingData && (
        <div className="flex-1 w-full max-w-md flex flex-col p-6 z-10">
          
          <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 text-center mb-8 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <h2 className="text-emerald-400 font-bold tracking-widest text-sm mb-2">HELP IS ON THE WAY</h2>
            <div className="text-6xl font-black text-white">{trackingData.eta} <span className="text-2xl text-emerald-400">MIN</span></div>
          </div>

          <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-8">
            <h3 className="text-gray-400 text-xs tracking-wider mb-4 uppercase">Dispatched Units</h3>
            <div className="space-y-3">
              {trackingData.assignedResources.map((resId, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Ambulance className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{resId}</p>
                    <p className="text-xs text-cyan-400 flex items-center gap-1"><Navigation className="w-3 h-3"/> En route</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full h-48 bg-[#0a101d] rounded-xl border border-white/10 overflow-hidden mb-6 flex items-center justify-center">
            {/* Simple CSS Grid Background representing city blocks */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
            
            {/* User Location */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <MapPin className="w-8 h-8 text-red-500 -mt-8" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500/40 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Moving Resource Dot */}
            <div 
              className="absolute w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee] transition-all duration-500"
              style={{ left: \`\${dotPos.x}%\`, top: \`\${dotPos.y}%\` }}
            ></div>
          </div>

          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm">Your emergency ID</p>
            <p className="font-mono font-bold text-gray-300">{trackingData.incidentId}</p>
          </div>

          <div className="mt-auto">
            <button 
              onClick={() => {
                setScreen("report");
                setInputText("");
                setLiveTranscript("");
                setTriageThought("");
                setDispatchThought("");
                setCoordThought("");
              }}
              className="w-full py-4 border border-white/20 hover:bg-white/5 rounded-xl font-bold tracking-wider transition-colors"
            >
              REPORT ANOTHER EMERGENCY
            </button>
          </div>
        </div>
      )}

    </div>
  );
}