import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Send } from "lucide-react";
import { startListening } from "../utils/speechRecognition";
import { triageAgent, dispatchAgent, coordinatorAgent } from "../utils/gemini";
import { mockResources } from "../data/mockResources";
import KavachLogo from "../components/KavachLogo";

export default function CitizenApp() {
  const navigate = useNavigate();
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
  const [countdown, setCountdown] = useState(240);

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

  const processEmergency = async (text) => {
    if (!text.trim()) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setScreen("processing");
    
    // STEP 1: Triage
    setActiveAgent("triage");
    setTriageThought("");
    const triageResult = await triageAgent(text, (thought) => {
      setTriageThought(thought);
    });
    
    // STEP 2: Dispatch
    setActiveAgent("dispatch");
    setDispatchThought("");
    const available = {
      ambulances: mockResources.ambulances.filter(r => r.status === "available"),
      fireTrucks: mockResources.fireTrucks.filter(r => r.status === "available")
    };
    const dispatchResult = await dispatchAgent(triageResult, available, (thought) => {
      setDispatchThought(thought);
    });

    // STEP 3: Coordinator
    setActiveAgent("coordinator");
    setCoordThought("");
    const coordResult = await coordinatorAgent(triageResult, dispatchResult, (thought) => {
      setCoordThought(thought);
    });

    // Done
    setActiveAgent("done");
    setTrackingData({ triageResult, dispatchResult, coordResult });
    setTimeout(() => setScreen("tracking"), 1000);
  };

  const handleSubmit = () => {
    const finalQuery = inputText || liveTranscript;
    processEmergency(finalQuery);
  };

  // --- Tracking Timer ---
  useEffect(() => {
    if (screen === "tracking") {
      setCountdown(240);
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [screen]);
  
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Render ---
  return (
    <div className="min-h-screen w-full relative overflow-hidden font-sans text-[#E8F4FD] flex flex-col items-center justify-center">
      
      {/* ===================== SCREEN 1: REPORT ===================== */}
      {screen === "report" && (
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center justify-center p-[60px_20px] gap-[24px] z-10">
          
          <div className="text-center mb-[32px]">
            <KavachLogo size={28} subtitle="EMERGENCY RESPONSE SYSTEM" />
            <p className="text-[#7B9BB5] text-[13px] mt-2">Koi bhi emergency. Bas ek tap.</p>
          </div>
          
          <div className="flex flex-col items-center w-full relative">
            <div className="relative flex items-center justify-center mt-[16px] mb-[32px] w-[150px] h-[150px]">
              {/* Mic Button Background Pulses */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full rounded-full border border-[#FF2D55] animate-[pulse-ring_1.5s_infinite]"></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-full border border-[#FF2D55] animate-[pulse-ring_2s_infinite] delay-[500ms]"></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-full border border-[#FF2D55] animate-[pulse-ring_2.5s_infinite] delay-[1000ms]"></div>
              </div>

              <button
                onClick={toggleListening}
                className="relative z-10 w-[150px] h-[150px] rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #FF4D6D, #FF2D55, #CC0033)",
                  boxShadow: "0 0 60px #FF2D5550"
                }}
              >
                <Mic className="w-6 h-6 text-white" />
              </button>
            </div>
            
            <h2 className="text-[18px] font-[800] text-[#E8F4FD] tracking-[1px] text-center mt-[24px]">TAP & SPEAK YOUR EMERGENCY</h2>
            <p className="text-[#7B9BB5] text-[13px] text-center mt-[8px] mb-[32px]">Hindi ya English mein boliye</p>

            {isListening && liveTranscript && (
              <div className="text-[#00C8FF] italic text-center mt-[10px] text-[14px] max-w-full px-4">
                "{liveTranscript}"
              </div>
            )}
          </div>

          <div className="w-full flex items-center gap-4 mt-[8px] mb-[24px]">
            <div className="flex-1 h-px bg-[#2A4A6B]"></div>
            <span className="text-[12px] font-[800] text-[#2A4A6B]">OR</span>
            <div className="flex-1 h-px bg-[#2A4A6B]"></div>
          </div>

          <div className="w-full">
            <textarea
              className="w-full glass-card text-[#E8F4FD] text-[14px] placeholder-[#2A4A6B] focus:outline-none focus:border-[#00C8FF] focus:shadow-[0_0_20px_#00C8FF33] resize-none h-[80px] mb-[16px]"
              placeholder="Type your emergency here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            
            <div className="flex gap-[10px] justify-center mb-[20px]">
              <button 
                onClick={() => setLanguage("hi-IN")}
                className={`flex-1 h-[40px] rounded-full text-[14px] font-[500] transition-colors ${language === "hi-IN" ? "bg-[#00C8FF20] border border-[#00C8FF] text-[#00C8FF]" : "bg-transparent border border-[rgba(0,200,255,0.12)] text-[#7B9BB5]"}`}
              >
                हिंदी
              </button>
              <button 
                onClick={() => setLanguage("en-US")}
                className={`flex-1 h-[40px] rounded-full text-[14px] font-[500] transition-colors ${language === "en-US" ? "bg-[#00C8FF20] border border-[#00C8FF] text-[#00C8FF]" : "bg-transparent border border-[rgba(0,200,255,0.12)] text-[#7B9BB5]"}`}
              >
                English
              </button>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            className="w-full h-[54px] rounded-[12px] font-[800] text-[16px] text-white tracking-[1px] flex justify-center items-center gap-[10px] hover:brightness-110 transition-all mt-[8px]"
            style={{ background: "linear-gradient(135deg, #FF2D55, #CC0033)", boxShadow: "0 4px 24px #FF2D5540" }}
          >
            REPORT EMERGENCY
          </button>

          <button 
            onClick={() => navigate('/manager')}
            className="absolute bottom-[20px] right-[20px] text-[#2A4A6B] text-[12px] font-[800] hover:text-[#00C8FF] transition-colors z-50"
          >
            Manager View &rarr;
          </button>
        </div>
      )}

      {/* ===================== SCREEN 2: PROCESSING ===================== */}
      {screen === "processing" && (
        <div className="w-full max-w-[500px] flex flex-col justify-center p-[40px_20px] z-10 w-full">
          
          <div className="mb-[30px] flex justify-center">
            <KavachLogo size={20} />
          </div>

          <h2 className="text-[#00C8FF] text-[18px] font-[700] text-center mb-[30px] animate-[pulse_1.5s_infinite]">
            AI Agents Responding...
          </h2>
          
          <div className="flex flex-col gap-[12px]">
            {/* Triage Agent */}
            <div className="glass-card animate-[fadeIn_0.5s_ease-out]" style={{ borderLeft: "4px solid #FF2D55" }}>
              <div className="flex items-center justify-between mb-[8px]">
                <div className="flex items-center gap-[8px]">
                  <div className={`w-[8px] h-[8px] rounded-full bg-[#FF2D55] ${activeAgent === "triage" ? "animate-[blink_1s_infinite]" : ""}`}></div>
                  <h3 className="font-[700] text-[12px] tracking-[1px] text-[#E8F4FD]">TRIAGE AGENT</h3>
                </div>
                <span className="text-[10px] px-[8px] py-[4px] rounded font-[700]" style={{
                  background: triageThought ? "#ffffff10" : (activeAgent === "triage" ? "#FF2D5520" : "#ffffff10"),
                  color: triageThought ? "#7B9BB5" : (activeAgent === "triage" ? "#FF2D55" : "#7B9BB5")
                }}>
                  {triageThought ? "IDLE" : (activeAgent === "triage" ? "ANALYZING" : "IDLE")}
                </span>
              </div>
              <p className="text-[13px] text-[#7B9BB5] italic min-h-[40px] leading-[1.6]">
                {triageThought || (activeAgent === "triage" ? "Analyzing emergency..." : "Waiting...")}
                {activeAgent === "triage" && <span className="inline-block w-[2px] h-[14px] ml-[4px] bg-[#00C8FF] align-middle animate-[blink_1s_infinite]"></span>}
              </p>
            </div>

            {/* Dispatch Agent */}
            <div className="glass-card animate-[fadeIn_0.5s_ease-out] delay-[200ms] fill-mode-both" style={{ borderLeft: "4px solid #FFB300" }}>
              <div className="flex items-center justify-between mb-[8px]">
                <div className="flex items-center gap-[8px]">
                  <div className={`w-[8px] h-[8px] rounded-full bg-[#FFB300] ${activeAgent === "dispatch" ? "animate-[blink_1s_infinite]" : ""}`}></div>
                  <h3 className="font-[700] text-[12px] tracking-[1px] text-[#E8F4FD]">DISPATCH AGENT</h3>
                </div>
                <span className="text-[10px] px-[8px] py-[4px] rounded font-[700]" style={{
                  background: dispatchThought ? "#ffffff10" : (activeAgent === "dispatch" ? "#FFB30020" : "#ffffff10"),
                  color: dispatchThought ? "#7B9BB5" : (activeAgent === "dispatch" ? "#FFB300" : "#7B9BB5")
                }}>
                  {dispatchThought ? "IDLE" : (activeAgent === "dispatch" ? "ROUTING" : "IDLE")}
                </span>
              </div>
              <p className="text-[13px] text-[#7B9BB5] italic min-h-[40px] leading-[1.6]">
                {dispatchThought || (activeAgent === "dispatch" ? "Finding nearest resources..." : "Waiting...")}
                {activeAgent === "dispatch" && <span className="inline-block w-[2px] h-[14px] ml-[4px] bg-[#00C8FF] align-middle animate-[blink_1s_infinite]"></span>}
              </p>
            </div>

            {/* Coordinator Agent */}
            <div className="glass-card animate-[fadeIn_0.5s_ease-out] delay-[400ms] fill-mode-both" style={{ borderLeft: "4px solid #00C8FF" }}>
              <div className="flex items-center justify-between mb-[8px]">
                <div className="flex items-center gap-[8px]">
                  <div className={`w-[8px] h-[8px] rounded-full bg-[#00C8FF] ${activeAgent === "coordinator" ? "animate-[blink_1s_infinite]" : ""}`}></div>
                  <h3 className="font-[700] text-[12px] tracking-[1px] text-[#E8F4FD]">COORDINATOR AGENT</h3>
                </div>
                <span className="text-[10px] px-[8px] py-[4px] rounded font-[700]" style={{
                  background: coordThought ? "#ffffff10" : (activeAgent === "coordinator" ? "#00C8FF20" : "#ffffff10"),
                  color: coordThought ? "#7B9BB5" : (activeAgent === "coordinator" ? "#00C8FF" : "#7B9BB5")
                }}>
                  {coordThought ? "IDLE" : (activeAgent === "coordinator" ? "CONFIRMED" : "IDLE")}
                </span>
              </div>
              <p className="text-[13px] text-[#7B9BB5] italic min-h-[40px] leading-[1.6]">
                {coordThought || (activeAgent === "coordinator" ? "Confirming routes..." : "Waiting...")}
                {activeAgent === "coordinator" && <span className="inline-block w-[2px] h-[14px] ml-[4px] bg-[#00C8FF] align-middle animate-[blink_1s_infinite]"></span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SCREEN 3: TRACKING ===================== */}
      {screen === "tracking" && trackingData && (
        <div className="w-full max-w-[500px] flex flex-col p-[20px] z-10 relative">
          
          <div className="mb-[20px] flex justify-center">
            <KavachLogo size={20} />
          </div>

          <div className="glass-card flex flex-col items-center justify-center p-[20px] mb-[20px]">
            <h2 className="text-[#00E676] font-[900] text-[18px] mb-[8px]">✓ HELP IS ON THE WAY</h2>
            <div className="text-[12px] text-[#7B9BB5] tracking-[2px]">ID: {trackingData.dispatchResult?.incidentId || "INC-" + Math.floor(100+Math.random()*900)}</div>
          </div>

          {/* LIVE TRACKING MAP */}
          <div 
            className="w-full h-[260px] rounded-[16px] relative overflow-hidden mb-[20px]"
            style={{ background: "#020B18", border: "1px solid rgba(0,200,255,0.15)" }}
          >
            {/* CSS Grid Background inside map */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none opacity-40"
              style={{ 
                backgroundImage: "linear-gradient(rgba(0,200,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.05) 1px, transparent 1px), linear-gradient(rgba(0,200,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.02) 1px, transparent 1px)", 
                backgroundSize: "50px 50px, 50px 50px, 10px 10px, 10px 10px" 
              }}
            ></div>

            <div className="absolute top-[8px] left-[8px] text-[#00C8FF] text-[10px] tracking-[2px] font-[700] z-20">LIVE TRACKING</div>
            
            <div className="absolute top-[8px] right-[10px] flex flex-col items-end z-20">
              <span className="text-[8px] text-[#7B9BB5] uppercase font-[700] mb-[2px]">ETA</span>
              <div className="text-[#00C8FF] text-[18px] font-mono font-[700] leading-none">
                {formatTime(countdown)}
              </div>
            </div>

            {/* Dashed Line */}
            <svg className="absolute inset-0 w-full h-full z-10" pointerEvents="none">
               <line x1="8%" y1="45%" x2="62%" y2="45%" stroke="rgba(0,230,118,0.4)" strokeWidth="2" strokeDasharray="4 4" />
            </svg>

            {/* Incident Location (Red Dot) */}
            <div className="absolute z-20 flex flex-col items-center" style={{ left: '62%', top: '45%', transform: 'translate(-50%, -50%)' }}>
              <div className="w-[12px] h-[12px] bg-[#FF2D55] rounded-full shadow-[0_0_15px_#FF2D55] animate-[incPulse_1.5s_infinite]"></div>
              <div className="text-[#ffffff] text-[9px] mt-[6px] font-[700] whitespace-nowrap">📍 Your Location</div>
            </div>

            {/* Moving Ambulance (Green Square) */}
            <div 
              className="absolute z-30 flex flex-col items-center animate-[vehicleMove_8s_ease-in-out_forwards]"
              style={{ top: '45%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-[12px] h-[12px] bg-[#00E676] rounded-[2px] shadow-[0_0_10px_#00E676]"></div>
              <div className="text-[#00E676] text-[9px] mt-[6px] font-[700] whitespace-nowrap">🚑 Ambulance</div>
            </div>
          </div>

          <div className="glass-card mb-[20px]">
            <h3 className="text-[10px] text-[#7B9BB5] tracking-[2px] font-[700] mb-[10px] uppercase">Dispatched Resources</h3>
            <div className="space-y-[10px]">
              {trackingData.dispatchResult?.assignedResources?.map((resId, idx) => (
                <div key={idx} className="flex items-center gap-[12px]">
                  <div className="w-[8px] h-[8px] rounded-[2px] bg-[#00E676] shadow-[0_0_5px_#00E676]"></div>
                  <div className="flex-1 font-mono text-[14px] font-[700]">{resId}</div>
                  <div className="text-[10px] text-[#00E676] bg-[#002D10] px-[8px] py-[4px] rounded font-[700]">EN ROUTE</div>
                </div>
              ))}
              {(!trackingData.dispatchResult?.assignedResources || trackingData.dispatchResult.assignedResources.length === 0) && (
                 <div className="flex items-center gap-[12px]">
                   <div className="w-[8px] h-[8px] rounded-[2px] bg-[#00E676] shadow-[0_0_5px_#00E676]"></div>
                   <div className="flex-1 font-mono text-[14px] font-[700]">AMB-01</div>
                   <div className="text-[10px] text-[#00E676] bg-[#002D10] px-[8px] py-[4px] rounded font-[700]">EN ROUTE</div>
                 </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => {
              setScreen("report");
              setInputText("");
              setLiveTranscript("");
            }}
            className="w-full h-[48px] border border-[#FF2D55] text-[#FF2D55] bg-transparent rounded-[12px] font-[700] text-[14px] tracking-[1px] hover:bg-[rgba(255,45,85,0.1)] transition-colors mt-auto"
          >
            REPORT ANOTHER EMERGENCY
          </button>
        </div>
      )}

    </div>
  );
}