import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CitizenApp from "./pages/CitizenApp";
import ManagerDashboard from "./pages/ManagerDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CitizenApp />} />
        <Route path="/manager" element={<ManagerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;