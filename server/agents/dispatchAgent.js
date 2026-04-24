// Mock ambulance data
const mockResources = [
  { id: 'AMB-101', status: 'available' },
  { id: 'AMB-102', status: 'busy' },
  { id: 'AMB-103', status: 'available' }
];

function dispatchAgent(data) {
  console.log("Dispatch Agent assigning...");
  const { severity, trustScore, resources } = data;

  const needsAmbulance = Array.isArray(resources) && resources.includes("ambulance");
  let assignedResource = null;
  let status = "pending";

  if (severity >= 4 && trustScore > 0.7) {
    status = "autoDispatch";
    if (needsAmbulance) {
      const available = mockResources.find(r => r.status === 'available');
      if (available) {
        assignedResource = available.id;
      }
    }
  } else {
    status = "manual";
  }

  return {
    assignedResource,
    status,
    dispatchThinking: `Dispatch rule evaluated. Status: ${status}. Assigned: ${assignedResource || 'none'}`
  };
}

module.exports = { dispatchAgent };
