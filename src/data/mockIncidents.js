export const mockIncidents = [
  {
    id: "INC-001",
    timestamp: "14:28:33",
    rawText: "There is a huge fire in the building, people are trapped on third floor!",
    language: "en",
    location: { lat: 28.6329, lng: 77.2195, name: "Connaught Place, Block A" },
    severity: 5,
    status: "active",
    resourcesNeeded: ["fire_truck", "ambulance"],
    assignedResources: ["FT-01", "AMB-03"],
    duplicate: false
  },
  {
    id: "INC-002",
    timestamp: "14:29:10",
    rawText: "Meri maa ko dil ka daura pad gaya hai, please jaldi ambulance bhejo!",
    language: "hi",
    location: { lat: 28.6450, lng: 77.2090, name: "Karol Bagh, Sector 12" },
    severity: 5,
    status: "active",
    resourcesNeeded: ["ambulance"],
    assignedResources: ["AMB-01"],
    duplicate: false
  },
  {
    id: "INC-003",
    timestamp: "14:30:45",
    rawText: "Road accident on highway, two vehicles collided, 4 people injured",
    language: "en",
    location: { lat: 28.6200, lng: 77.2300, name: "NH-48, Near Dhaula Kuan" },
    severity: 4,
    status: "pending",
    resourcesNeeded: ["ambulance", "police"],
    assignedResources: [],
    duplicate: false
  },
  {
    id: "INC-004",
    timestamp: "14:31:02",
    rawText: "Aag lag gayi hai market mein, bohot dhua aa raha hai!",
    language: "hi",
    location: { lat: 28.6550, lng: 77.1950, name: "Paharganj Market" },
    severity: 3,
    status: "pending",
    resourcesNeeded: ["fire_truck"],
    assignedResources: [],
    duplicate: false
  },
  {
    id: "INC-005",
    timestamp: "14:31:52",
    rawText: "Someone collapsed on the street, not breathing properly",
    language: "en",
    location: { lat: 28.6280, lng: 77.2100, name: "Janpath Road" },
    severity: 4,
    status: "pending",
    resourcesNeeded: ["ambulance"],
    assignedResources: [],
    duplicate: false
  }
];