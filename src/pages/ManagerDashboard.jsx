import TopBar from "../components/manager/TopBar";
import MapView from "../components/manager/MapView";
import AgentPanel from "../components/manager/AgentPanel";
import IncidentFeed from "../components/manager/IncidentFeed";
import FleetStatus from "../components/manager/FleetStatus";
import StatsBar from "../components/manager/StatsBar";
import VoiceBar from "../components/manager/VoiceBar";

export default function ManagerDashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Manager Dashboard</h1>
      <TopBar />
      <StatsBar />
      <div className="flex gap-4 my-4">
        <MapView />
        <IncidentFeed />
      </div>
      <div className="flex gap-4">
        <AgentPanel />
        <FleetStatus />
      </div>
      <VoiceBar />
    </div>
  );
}