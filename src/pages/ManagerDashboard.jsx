import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { mockIncidents } from "../data/mockIncidents";
import { mockResources } from "../data/mockResources";
import { chaosScenarios } from "../data/mockScenarios";
import { triageAgent, dispatchAgent, coordinatorAgent } from "../utils/gemini";
import { startListening } from "../utils/speechRecognition";

// Map coordinates normalization helper
const getPos = (lat, lng) => {
  const minLat = 28.6000, maxLat = 28.6700;
  const minLng = 77.1800, maxLng = 77.2500;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
  return { left: \`\${x}%\`, top: \`\${y}%\` };
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState(mockIncidents);
  const [resources, setResources] = useState(mockResources);
  const [isChaosMode, setIsChaosMode] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [flashIncidents, setFlashIncidents] = useState(false);
  const recognitionRef = useRef(null);

  // Agent States
  const [agents, setAgents] = useState({
    triage: { status: "IDLE", thought: "Monitoring incoming channels..." },
    dispatch: { status: "IDLE", thought: "Awaiting incident assignments..." },
    coordinator: { status: "IDLE", thought: "Systems nominal." }
  });

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Flash Incidents list on new incident
  useEffect(() => {
    if (incidents.length > mockIncidents.length) {
      setFlashIncidents(true);
      const t = setTimeout(() => setFlashIncidents(false), 1000);
      return () => clearTimeout(t);
    }
  }, [incidents.length]);

  // Update Agent State helper
  const updateAgent = (agentId, data) => {
    setAgents(prev => ({ ...prev, [agentId]: { ...prev[agentId], ...data } }));
  };

  const processIncident = async (query) => {
    const incidentId = "INC-" + Math.floor(100 + Math.random() * 900);
    
    // 1. Add pending incident
    let newIncident = {
      id: incidentId,
      timestamp: new Date().toLocaleTimeString(),
      rawText: query,
      language: "en",
      location: { lat: 28.6300 + (Math.random() * 0.02 - 0.01), lng: 77.2150 + (Math.random() * 0.02 - 0.01), name: "Unknown" },
      severity: 3,
      status: "pending",
      resourcesNeeded: [],
      assignedResources: [],
      duplicate: false
    };
    
    setIncidents(prev => [newIncident, ...prev]);

    // 2. Triage
    updateAgent("triage", { status: "ANALYZING", thought: "Analyzing call..." });
    const triageResult = await triageAgent(query, (text) => updateAgent("triage", { thought: text }));
    
    newIncident = { ...newIncident, ...triageResult };
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? newIncident : inc));
    updateAgent("triage", { status: "IDLE", thought: "Triage complete." });

    // 3. Dispatch
    updateAgent("dispatch", { status: "ROUTING", thought: "Finding best units..." });
    setResources(currentResources => {
      const avail = {
        ambulances: currentResources.ambulances.filter(r => r.status === "available"),
        fireTrucks: currentResources.fireTrucks.filter(r => r.status === "available"),
        police: currentResources.police.filter(r => r.status === "available")
      };
      
      // We run this async but immediately use the current resources snapshot
      dispatchAgent(newIncident, avail, (text) => updateAgent("dispatch", { thought: text })).then(dispatchResult => {
        newIncident.assignedResources = dispatchResult.assignedResources || [];
        setIncidents(prev => prev.map(inc => inc.id === incidentId ? newIncident : inc));
        
        // Update resources state locally
        setResources(prev => {
          const updated = JSON.parse(JSON.stringify(prev));
          const toAssign = dispatchResult.assignedResources || [];
          for (const resId of toAssign) {
            ["ambulances", "fireTrucks", "police"].forEach(cat => {
              const r = updated[cat].find(x => x.id === resId);
              if (r) { r.status = "deployed"; r.assignedTo = incidentId; }
            });
          }
          return updated;
        });
        
        updateAgent("dispatch", { status: "IDLE", thought: "Units deployed." });

        // 4. Coordinator
        updateAgent("coordinator", { status: "CONFIRMED", thought: "Confirming dispatch..." });
        coordinatorAgent(newIncident, dispatchResult, (text) => updateAgent("coordinator", { thought: text })).then(() => {
          newIncident.status = "active";
          setIncidents(prev => prev.map(inc => inc.id === incidentId ? newIncident : inc));
          updateAgent("coordinator", { status: "IDLE", thought: "Systems nominal." });
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
  
  return (
    <div className="relative w-screen h-screen bg-[#05080F] text-white font-mono overflow-hidden">
      
      {/* GLOBAL ANIMATIONS */}
      <style>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        .animate-scan {
          animation: scan 5s linear infinite;
        }
      `}</style>

      {/* FULL SCREEN MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        {/* CSS Grid Overlay */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#0c1b33 1px, transparent 1px), linear-gradient(90deg, #0c1b33 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
        
        {/* Animated Scanning Line */}
        <div className="absolute left-0 w-full h-[2px] bg-cyan-500/50 shadow-[0_0_10px_#06b6d4] animate-scan z-10"></div>
        
        {/* SVG overlay for connecting lines */}
        <svg className="absolute inset-0 w-full h-full z-10" style={{ pointerEvents: "none" }}>
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
                stroke="rgba(6, 182, 212, 0.4)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            );
          })}
        </svg>

        {/* Incident Markers */}
        {incidents.map((inc) => {
          if (!inc.location) return null;
          const pos = getPos(inc.location.lat, inc.location.lng);
          const isHighSev = inc.severity >= 4;
          return (
            <div key={inc.id} className="absolute z-20 flex flex-col items-center" style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}>
              <div className={`w-4 h-4 rounded-full ${isHighSev ? 'bg-red-500 animate-ping shadow-[0_0_15px_#ef4444]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`}></div>
              <div className="absolute top-6 whitespace-nowrap text-[10px] bg-black/60 px-1 border border-white/10 rounded">{inc.id}</div>
            </div>
          );
        })}

        {/* Vehicle Markers */}
        {allVehicles.map((v) => {
          if (!v.location) return null;
          const pos = getPos(v.location.lat, v.location.lng);
          const isAmbulance = v.id.startsWith("AMB");
          const isFire = v.id.startsWith("FT");
          return (
            <div key={v.id} className="absolute z-20 flex flex-col items-center" style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}>
              <div className={`w-3 h-3 ${isAmbulance ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : (isFire ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-white shadow-[0_0_10px_white]')}`}></div>
              <div className="absolute top-4 whitespace-nowrap text-[9px] text-gray-300">{v.id}</div>
            </div>
          );
        })}
      </div>

      {/* TOP BAR */}
      <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-[#05080F] via-[#05080F]/80 to-transparent flex justify-between items-start p-6 z-50 pointer-events-none">
        <div>
          <h1 className="text-4xl font-black text-red-600 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">KAVACH</h1>
          <p className="text-xs text-cyan-400 tracking-widest mt-1">SMART CITY DISPATCH GRID</p>
        </div>
        <div className="flex items-center gap-6 pointer-events-auto">
          {isChaosMode && (
            <div className="flex items-center gap-2 bg-red-900/40 border border-red-500 text-red-400 px-3 py-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <ShieldAlert className="w-4 h-4" /> <span>CHAOS MODE ACTIVE</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-green-900/30 border border-green-500/50 px-3 py-1 rounded text-green-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div> LIVE 
            <span className="bg-green-500/20 px-1.5 rounded text-xs">{incidents.length}</span>
          </div>
          <div className="text-cyan-500 font-bold">DELHI NCR</div>
          <div className="text-xl font-light text-white tracking-widest mr-4">{clock.toLocaleTimeString('en-US', { hour12: false })}</div>
          
          <button 
            onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded text-xs font-bold text-gray-300 transition-colors"
          >
            Citizen View &rarr;
          </button>
        </div>
      </div>

      {/* FLOATING LEFT PANEL - AGENT INTELLIGENCE */}
      <div className="absolute top-[100px] left-6 w-[280px] bg-[#07101E]/85 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 z-40 shadow-xl shadow-cyan-900/20">
        <h2 className="text-[10px] text-gray-500 font-bold tracking-widest mb-4">AGENT INTELLIGENCE</h2>
        <div className="space-y-4">
          
          {/* Triage Agent */}
          <div className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${agents.triage.status !== 'IDLE' ? 'bg-red-500 animate-ping' : 'bg-red-500/50'}`}></div>
                <span className="text-xs font-bold text-red-400">TRIAGE</span>
              </div>
              <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded">{agents.triage.status}</span>
            </div>
            <p className="text-[10px] text-gray-400 italic line-clamp-3">{agents.triage.thought}</p>
          </div>

          {/* Dispatch Agent */}
          <div className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${agents.dispatch.status !== 'IDLE' ? 'bg-amber-500 animate-ping' : 'bg-amber-500/50'}`}></div>
                <span className="text-xs font-bold text-amber-400">DISPATCH</span>
              </div>
              <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded">{agents.dispatch.status}</span>
            </div>
            <p className="text-[10px] text-gray-400 italic line-clamp-3">{agents.dispatch.thought}</p>
          </div>

          {/* Coordinator Agent */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${agents.coordinator.status !== 'IDLE' ? 'bg-teal-500 animate-ping' : 'bg-teal-500/50'}`}></div>
                <span className="text-xs font-bold text-teal-400">COORDINATOR</span>
              </div>
              <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded">{agents.coordinator.status}</span>
            </div>
            <p className="text-[10px] text-gray-400 italic line-clamp-3">{agents.coordinator.thought}</p>
          </div>

        </div>
      </div>

      {/* FLOATING RIGHT PANEL - INCIDENTS & FLEET */}
      <div className="absolute top-[100px] right-6 w-[280px] flex flex-col gap-4 z-40">
        
        {/* Incidents Card */}
        <div className={`bg-[#07101E]/85 backdrop-blur-md border rounded-xl p-4 transition-all duration-300 max-h-[350px] flex flex-col ${flashIncidents ? 'border-red-400 shadow-[0_0_20px_#ef4444]' : 'border-red-500/30 shadow-xl shadow-red-900/20'}`}>
          <h2 className="text-[10px] text-gray-500 font-bold tracking-widest mb-3 flex items-center justify-between">
            LIVE INCIDENTS
            <span className="bg-red-500/20 text-red-400 px-1.5 rounded">{incidents.length}</span>
          </h2>
          <div className="overflow-y-auto pr-1 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-white/10">
            {incidents.slice(0, 15).map(inc => (
              <div key={inc.id} className="bg-white/5 border border-white/5 p-2 rounded">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-cyan-400 font-bold">{inc.id}</span>
                  <span className="text-gray-500">{inc.timestamp}</span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-2 leading-tight">{inc.rawText}</p>
                <div className="flex justify-between mt-2">
                  <span className={`text-[9px] px-1 rounded ${inc.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{inc.status.toUpperCase()}</span>
                  <span className="text-[9px] text-gray-500">SEV {inc.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Card */}
        <div className="bg-[#07101E]/85 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 shadow-xl shadow-cyan-900/20">
          <h2 className="text-[10px] text-gray-500 font-bold tracking-widest mb-3 flex justify-between">
            FLEET STATUS
            {freeAmbulances === 0 && <span className="text-amber-500 bg-amber-500/20 px-1 rounded animate-pulse">ZONE EXHAUSTED</span>}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-emerald-500/30 rounded p-2 text-center">
              <div className="text-[10px] text-gray-400 mb-1">AMB FREE</div>
              <div className="text-lg text-emerald-400">{freeAmbulances}</div>
            </div>
            <div className="bg-white/5 border border-red-500/30 rounded p-2 text-center">
              <div className="text-[10px] text-gray-400 mb-1">AMB DEPLOYED</div>
              <div className="text-lg text-red-400">{resources.ambulances.filter(r => r.status === 'deployed').length}</div>
            </div>
            <div className="bg-white/5 border border-blue-500/30 rounded p-2 text-center">
              <div className="text-[10px] text-gray-400 mb-1">FIRE FREE</div>
              <div className="text-lg text-blue-400">{resources.fireTrucks.filter(r => r.status === 'available').length}</div>
            </div>
            <div className="bg-white/5 border border-red-500/30 rounded p-2 text-center">
              <div className="text-[10px] text-gray-400 mb-1">FIRE DEPLOYED</div>
              <div className="text-lg text-red-400">{resources.fireTrucks.filter(r => r.status === 'deployed').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#05080F] via-[#05080F]/90 to-transparent p-6 z-50 flex flex-col items-center gap-6">
        
        {/* Stat Cards */}
        <div className="flex justify-center gap-4 w-full">
          {[
            { label: "TOTAL INCIDENTS", value: incidents.length, color: "text-cyan-400" },
            { label: "UNITS DEPLOYED", value: deployedVehicles.length, color: "text-amber-400" },
            { label: "AVG ETA", value: "3.5 MIN", color: "text-emerald-400" },
            { label: "DUPLICATES BLOCKED", value: "0", color: "text-gray-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 px-6 py-2 rounded-lg text-center backdrop-blur-sm min-w-[160px]">
              <div className="text-[10px] text-gray-500 tracking-widest">{stat.label}</div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Input Controls */}
        <div className="flex items-center gap-4 w-full max-w-4xl bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md">
          <button 
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isListening ? 'bg-red-500 shadow-[0_0_20px_#ef4444] animate-pulse' : 'bg-red-500/20 text-red-400 hover:bg-red-500/40'}`}
          >
            <Mic className="w-5 h-5" />
          </button>
          
          <input 
            type="text" 
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-600 font-mono text-sm"
            placeholder="Type emergency scenario or use mic..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleInputSubmit}
          />
          
          <button 
            onClick={handleChaosMode}
            disabled={isChaosMode}
            className={`px-6 py-3 rounded-lg font-black tracking-widest flex items-center gap-2 transition-all flex-shrink-0 ${isChaosMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'}`}
          >
            <AlertTriangle className="w-5 h-5" /> CHAOS
          </button>
        </div>
      </div>

    </div>
  );
}