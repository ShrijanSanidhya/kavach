import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, AlertTriangle } from "lucide-react";
import { mockIncidents } from "../data/mockIncidents";
import { mockResources } from "../data/mockResources";
import { chaosScenarios } from "../data/mockScenarios";
import { triageAgent, dispatchAgent, coordinatorAgent } from "../utils/gemini";
import { startListening } from "../utils/speechRecognition";
import KavachLogo from "../components/KavachLogo";

// Map coordinates normalization helper
const getPos = (lat, lng) => {
  const minLat = 28.6000, maxLat = 28.6700;
  const minLng = 77.1800, maxLng = 77.2500;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
  return { left: `${x}%`, top: `${y}%` };
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState(mockIncidents);
  const [resources, setResources] = useState(mockResources);
  const [isChaosMode, setIsChaosMode] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Agent States
  const [triageStatus, setTriageStatus] = useState("IDLE");
  const [triageThought, setTriageThought] = useState("Monitoring incoming channels...");
  const [dispatchStatus, setDispatchStatus] = useState("IDLE");
  const [dispatchThought, setDispatchThought] = useState("Awaiting incident assignments...");
  const [coordStatus, setCoordStatus] = useState("IDLE");
  const [coordThought, setCoordThought] = useState("Systems nominal.");

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const processIncident = async (query) => {
    const incidentId = "INC-" + Math.floor(100 + Math.random() * 900);
    
    // 1. Add pending incident
    let newIncident = {
      id: incidentId,
      timestamp: new Date().toLocaleTimeString(),
      rawText: query,
      language: "en",
      location: { lat: 28.6300 + (Math.random() * 0.02 - 0.01), lng: 77.2150 + (Math.random() * 0.02 - 0.01), name: "Unknown" },
      severity: null, // Don't hardcode, wait for triageAgent
      status: "pending",
      resourcesNeeded: [],
      assignedResources: [],
      duplicate: false
    };
    
    setIncidents(prev => [newIncident, ...prev]);

    // 2. Triage
    setTriageStatus("ANALYZING");
    setTriageThought("");
    const triageResult = await triageAgent(query, (text) => setTriageThought(text));
    
    newIncident = { ...newIncident, ...triageResult, severity: triageResult.severity || 3 };
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? newIncident : inc));
    setTriageStatus("IDLE");

    // 3. Dispatch
    setDispatchStatus("ROUTING");
    setDispatchThought("");
    setResources(currentResources => {
      const avail = {
        ambulances: currentResources.ambulances.filter(r => r.status === "available"),
        fireTrucks: currentResources.fireTrucks.filter(r => r.status === "available"),
        police: currentResources.police.filter(r => r.status === "available")
      };
      
      dispatchAgent(newIncident, avail, (text) => setDispatchThought(text)).then(dispatchResult => {
        newIncident.assignedResources = dispatchResult.assignedResources || [];
        setIncidents(prev => prev.map(inc => inc.id === incidentId ? newIncident : inc));
        
        setResources(prevRes => {
          const updated = JSON.parse(JSON.stringify(prevRes));
          const toAssign = dispatchResult.assignedResources || [];
          for (const resId of toAssign) {
            ["ambulances", "fireTrucks", "police"].forEach(cat => {
              const r = updated[cat].find(x => x.id === resId);
              if (r) { r.status = "deployed"; r.assignedTo = incidentId; }
            });
          }
          return updated;
        });
        
        setDispatchStatus("IDLE");

        // 4. Coordinator
        setCoordStatus("CONFIRMED");
        setCoordThought("");
        coordinatorAgent(newIncident, dispatchResult, (text) => setCoordThought(text)).then(() => {
          newIncident.status = "active";
          setIncidents(prev => prev.map(inc => inc.id === incidentId ? newIncident : inc));
          setCoordStatus("IDLE");
        });
      });
      return currentResources;
    });
  };

  const handleInputSubmit = (e) => {
    if (e.key === "Enter" && inputText.trim()) {
      processIncident(inputText);
      setInputText("");
    }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current = startListening(
        (transcript, isFinal) => {
          setInputText(transcript);
          if (isFinal) {
            setIsListening(false);
            processIncident(transcript);
            setInputText("");
          }
        },
        () => setIsListening(false),
        "en-US"
      );
    }
  };

  const handleChaosMode = () => {
    setIsChaosMode(true);
    chaosScenarios.forEach((scenario) => {
      setTimeout(() => {
        processIncident(scenario.rawText);
      }, scenario.delay);
    });
  };

  const allVehicles = [...resources.ambulances, ...resources.fireTrucks, ...resources.police];
  const deployedVehicles = allVehicles.filter(v => v.status === "deployed");
  const freeAmbulances = resources.ambulances.filter(r => r.status === 'available').length;

  const getSevBadge = (sev) => {
    if (sev >= 5) return { bg: "#2D0010", color: "#FF2D55" };
    if (sev === 4) return { bg: "#2D1500", color: "#FF6D00" };
    if (sev === 3) return { bg: "#2D2000", color: "#FFB300" };
    return { bg: "#002D10", color: "#00E676" };
  };

  const getStatusBadge = (status) => {
    if (status === "ANALYZING") return { bg: "#FF2D5520", color: "#FF2D55" };
    if (status === "ROUTING") return { bg: "#FFB30020", color: "#FFB300" };
    if (status === "CONFIRMED") return { bg: "#00C8FF20", color: "#00C8FF" };
    return { bg: "#ffffff10", color: "#7B9BB5" };
  };

  return (
    <div className="relative w-[100vw] h-[100vh] overflow-hidden bg-[#020B18]">
      
      {/* MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-100" style={{ 
            backgroundImage: "linear-gradient(rgba(0,200,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.05) 1px, transparent 1px), linear-gradient(rgba(0,200,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.02) 1px, transparent 1px)", 
            backgroundSize: "50px 50px, 50px 50px, 10px 10px, 10px 10px" 
        }}></div>
        <div className="absolute left-0 w-full h-[2px] animate-[scan_5s_linear_infinite] z-10" style={{
          background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.3), #00C8FF, rgba(0,200,255,0.3), transparent)"
        }}></div>
        
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {deployedVehicles.map((vehicle, idx) => {
            const incident = incidents.find(i => i.id === vehicle.assignedTo);
            if (!incident || !incident.location) return null;
            const p1 = getPos(vehicle.location.lat, vehicle.location.lng);
            const p2 = getPos(incident.location.lat, incident.location.lng);
            return (
              <line 
                key={idx}
                x1={p1.left} y1={p1.top}
                x2={p2.left} y2={p2.top}
                stroke="rgba(0, 230, 118, 0.4)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-[pulse_2s_infinite]"
              />
            );
          })}
        </svg>

        {incidents.map((inc) => {
          if (!inc.location) return null;
          const pos = getPos(inc.location.lat, inc.location.lng);
          return (
            <div key={inc.id} className="absolute z-20 flex flex-col items-center" style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}>
              <div className="w-[12px] h-[12px] rounded-full bg-[#FF2D55] shadow-[0_0_15px_#FF2D55] animate-[incPulse_1.5s_infinite]"></div>
            </div>
          );
        })}

        {allVehicles.map((v) => {
          if (!v.location) return null;
          const pos = getPos(v.location.lat, v.location.lng);
          return (
            <div key={v.id} className="absolute z-20 flex flex-col items-center" style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}>
              <div className="w-[10px] h-[10px] rounded-[2px] bg-[#00E676] shadow-[0_0_10px_#00E676]"></div>
            </div>
          );
        })}
      </div>

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-[12px_20px]" style={{ background: "linear-gradient(180deg, #020B18F5, transparent)" }}>
        <div>
          <KavachLogo size={32} subtitle="SMART CITY DISPATCH GRID" />
        </div>
        <div className="flex items-center gap-[12px]">
          <div className="flex items-center gap-2 bg-[#00E67615] border border-[rgba(0,230,118,0.4)] px-3 py-1 rounded text-[#00E676] text-[12px] font-[700]">
             ● LIVE {incidents.length}
          </div>
          <div className="bg-[#00C8FF10] border border-[rgba(0,200,255,0.3)] text-[#00C8FF] px-3 py-1 rounded text-[12px] font-[700]">
            DELHI NCR
          </div>
          <div className="text-[#7B9BB5] text-[13px] tracking-[2px] font-mono font-[700]">
            {clock.toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>

      {/* AGENT PANEL */}
      <div className="glass-card fixed top-[70px] left-[14px] w-[220px] z-40 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <h2 className="text-[10px] text-[#7B9BB5] font-[700] tracking-[2px] mb-[16px]">AGENT INTELLIGENCE</h2>
        
        <div className="flex flex-col gap-[16px]">
          {/* Triage */}
          <div>
            <div className="flex items-center justify-between mb-[8px]">
               <div className="flex items-center gap-2">
                 <div className={`w-[8px] h-[8px] rounded-full bg-[#FF2D55] ${triageStatus !== 'IDLE' ? 'animate-[blink_1s_infinite]' : ''}`}></div>
                 <span className="text-[10px] font-bold text-[#E8F4FD]">TRIAGE</span>
               </div>
               <span className="text-[8px] px-2 py-[2px] rounded font-[700]" style={{ background: getStatusBadge(triageStatus).bg, color: getStatusBadge(triageStatus).color }}>{triageStatus}</span>
            </div>
            <div className="text-[11px] italic text-[#7B9BB5] leading-[1.6] pl-[8px]" style={{ borderLeft: "4px solid #FF2D55" }}>
              {triageThought || "Monitoring incoming channels..."}
              {triageStatus !== 'IDLE' && <span className="inline-block w-[4px] h-[12px] bg-[#FF2D55] animate-[blink_1s_infinite] ml-1 align-middle"></span>}
            </div>
          </div>

          {/* Dispatch */}
          <div>
            <div className="flex items-center justify-between mb-[8px]">
               <div className="flex items-center gap-2">
                 <div className={`w-[8px] h-[8px] rounded-full bg-[#FFB300] ${dispatchStatus !== 'IDLE' ? 'animate-[blink_1s_infinite]' : ''}`}></div>
                 <span className="text-[10px] font-bold text-[#E8F4FD]">DISPATCH</span>
               </div>
               <span className="text-[8px] px-2 py-[2px] rounded font-[700]" style={{ background: getStatusBadge(dispatchStatus).bg, color: getStatusBadge(dispatchStatus).color }}>{dispatchStatus}</span>
            </div>
            <div className="text-[11px] italic text-[#7B9BB5] leading-[1.6] pl-[8px]" style={{ borderLeft: "4px solid #FFB300" }}>
              {dispatchThought || "Awaiting incident assignments..."}
              {dispatchStatus !== 'IDLE' && <span className="inline-block w-[4px] h-[12px] bg-[#FFB300] animate-[blink_1s_infinite] ml-1 align-middle"></span>}
            </div>
          </div>

          {/* Coordinator */}
          <div>
            <div className="flex items-center justify-between mb-[8px]">
               <div className="flex items-center gap-2">
                 <div className={`w-[8px] h-[8px] rounded-full bg-[#00C8FF] ${coordStatus !== 'IDLE' ? 'animate-[blink_1s_infinite]' : ''}`}></div>
                 <span className="text-[10px] font-bold text-[#E8F4FD]">COORDINATOR</span>
               </div>
               <span className="text-[8px] px-2 py-[2px] rounded font-[700]" style={{ background: getStatusBadge(coordStatus).bg, color: getStatusBadge(coordStatus).color }}>{coordStatus}</span>
            </div>
            <div className="text-[11px] italic text-[#7B9BB5] leading-[1.6] pl-[8px]" style={{ borderLeft: "4px solid #00C8FF" }}>
              {coordThought || "Systems nominal."}
              {coordStatus !== 'IDLE' && <span className="inline-block w-[4px] h-[12px] bg-[#00C8FF] animate-[blink_1s_infinite] ml-1 align-middle"></span>}
            </div>
          </div>
        </div>
      </div>

      {/* INCIDENTS PANEL */}
      <div className="glass-card fixed top-[70px] right-[14px] w-[210px] z-40 overflow-y-auto" style={{ maxHeight: "300px" }}>
         <div className="flex items-center justify-between mb-[12px]">
            <h2 className="text-[10px] text-[#7B9BB5] font-[700] tracking-[2px]">INCIDENTS</h2>
         </div>
         <div className="space-y-[8px]">
            {incidents.slice(0, 15).map(inc => {
              const sevBadge = getSevBadge(inc.severity);
              return (
                <div key={inc.id} className="p-[8px] rounded-[6px]" style={{ background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${sevBadge.color}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#E8F4FD] font-bold">{inc.id}</span>
                    <span className="text-[8px] px-[4px] py-[2px] rounded font-[700]" style={{ background: sevBadge.bg, color: sevBadge.color }}>SEV {inc.severity || '?'}</span>
                  </div>
                  <div className="text-[10px] text-[#7B9BB5] mt-[4px] line-clamp-2">{inc.rawText}</div>
                  <div className="text-[8px] text-[#00C8FF] mt-[6px] font-[700]">{inc.status.toUpperCase()}</div>
                </div>
              );
            })}
         </div>
      </div>

      {/* FLEET PANEL */}
      <div className="glass-card fixed right-[14px] w-[210px] z-40" style={{ top: "calc(70px + 310px)" }}>
         <h2 className="text-[10px] text-[#7B9BB5] font-[700] tracking-[2px] mb-[12px]">FLEET STATUS</h2>
         <div className="grid grid-cols-2 gap-[8px]">
            <div className="bg-[rgba(255,255,255,0.02)] rounded-[8px] p-[8px] text-center border border-[rgba(0,200,255,0.05)]">
              <div className="text-[8px] text-[#7B9BB5] font-[700] mb-1">AMB FREE</div>
              <div className="text-[16px] font-[900] text-[#00E676]">{freeAmbulances}</div>
            </div>
            <div className="bg-[rgba(255,255,255,0.02)] rounded-[8px] p-[8px] text-center border border-[rgba(0,200,255,0.05)]">
              <div className="text-[8px] text-[#7B9BB5] font-[700] mb-1">AMB DEPLOY</div>
              <div className="text-[16px] font-[900] text-[#FF2D55]">{resources.ambulances.filter(r => r.status === 'deployed').length}</div>
            </div>
            <div className="bg-[rgba(255,255,255,0.02)] rounded-[8px] p-[8px] text-center border border-[rgba(0,200,255,0.05)]">
              <div className="text-[8px] text-[#7B9BB5] font-[700] mb-1">FIRE FREE</div>
              <div className="text-[16px] font-[900] text-[#00E676]">{resources.fireTrucks.filter(r => r.status === 'available').length}</div>
            </div>
            <div className="bg-[rgba(255,255,255,0.02)] rounded-[8px] p-[8px] text-center border border-[rgba(0,200,255,0.05)]">
              <div className="text-[8px] text-[#7B9BB5] font-[700] mb-1">FIRE DEPLOY</div>
              <div className="text-[16px] font-[900] text-[#FFB300]">{resources.fireTrucks.filter(r => r.status === 'deployed').length}</div>
            </div>
         </div>
      </div>

      {/* BOTTOM BAR — single line: [mic + input] [4 stat cards] [CHAOS] */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-[12px] p-[10px_20px]"
        style={{ background: "linear-gradient(0deg, #020B18F5, transparent)" }}
      >
        {/* LEFT — mic + input */}
        <div className="flex items-center gap-[8px] flex-1 min-w-0">
          <button
            onClick={toggleMic}
            className="w-[38px] h-[38px] rounded-full bg-[#FF2D55] flex items-center justify-center flex-shrink-0 transition-all"
            style={{ boxShadow: isListening ? "0 0 20px #FF2D5580" : "0 0 10px #FF2D5540" }}
          >
            <Mic className={`w-4 h-4 text-white ${isListening ? 'animate-[pulse_1s_infinite]' : ''}`} />
          </button>
          <input
            type="text"
            className="flex-1 min-w-0 glass-card !p-[0_14px] h-[38px] rounded-[20px] text-[#E8F4FD] placeholder-[#2A4A6B] font-mono text-[12px] outline-none focus:border-[#00C8FF]"
            placeholder="Type scenario or use mic..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleInputSubmit}
          />
        </div>

        {/* CENTER — 4 stat cards */}
        <div className="flex items-center gap-[6px] flex-shrink-0">
          <div className="glass-card !p-[6px_12px] text-center rounded-[8px]">
            <div className="text-[16px] font-[900] text-[#FF2D55] leading-none">{incidents.length}</div>
            <div className="text-[7px] font-[700] text-[#7B9BB5] uppercase mt-[2px]">Incidents</div>
          </div>
          <div className="glass-card !p-[6px_12px] text-center rounded-[8px]">
            <div className="text-[16px] font-[900] text-[#FFB300] leading-none">{deployedVehicles.length}</div>
            <div className="text-[7px] font-[700] text-[#7B9BB5] uppercase mt-[2px]">Deployed</div>
          </div>
          <div className="glass-card !p-[6px_12px] text-center rounded-[8px]">
            <div className="text-[16px] font-[900] text-[#00C8FF] leading-none">3.5</div>
            <div className="text-[7px] font-[700] text-[#7B9BB5] uppercase mt-[2px]">Avg ETA</div>
          </div>
          <div className="glass-card !p-[6px_12px] text-center rounded-[8px]">
            <div className="text-[16px] font-[900] text-[#00E676] leading-none">0</div>
            <div className="text-[7px] font-[700] text-[#7B9BB5] uppercase mt-[2px]">Dupes</div>
          </div>
        </div>

        {/* RIGHT — CHAOS button */}
        <button
          onClick={handleChaosMode}
          disabled={isChaosMode}
          className="flex-shrink-0 whitespace-nowrap bg-[rgba(26,0,16,0.88)] border border-[#FF2D55] text-[#FF2D55] p-[8px_16px] h-[38px] rounded-[12px] font-[900] text-[12px] tracking-[1px] flex items-center justify-center gap-[6px] hover:bg-[rgba(255,45,85,0.1)] transition-colors"
        >
          <AlertTriangle className="w-4 h-4" /> CHAOS
        </button>
      </div>

    </div>
  );
}