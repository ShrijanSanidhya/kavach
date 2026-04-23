import ReportScreen from "../components/citizen/ReportScreen";
import TrackingScreen from "../components/citizen/TrackingScreen";

export default function CitizenApp() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Citizen App</h1>
      <ReportScreen />
      <TrackingScreen />
    </div>
  );
}