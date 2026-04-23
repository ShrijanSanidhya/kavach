export const mockResources = {
  ambulances: [
    { id: "AMB-01", status: "deployed", location: { lat: 28.6420, lng: 77.2080 }, eta: 2, assignedTo: "INC-002" },
    { id: "AMB-02", status: "available", location: { lat: 28.6100, lng: 77.2400 } },
    { id: "AMB-03", status: "deployed", location: { lat: 28.6310, lng: 77.2180 }, eta: 4, assignedTo: "INC-001" },
    { id: "AMB-04", status: "available", location: { lat: 28.6600, lng: 77.1900 } },
    { id: "AMB-05", status: "available", location: { lat: 28.6350, lng: 77.2250 } },
    { id: "AMB-06", status: "available", location: { lat: 28.6480, lng: 77.2150 } }
  ],
  fireTrucks: [
    { id: "FT-01", status: "deployed", location: { lat: 28.6320, lng: 77.2190 }, eta: 3, assignedTo: "INC-001" },
    { id: "FT-02", status: "available", location: { lat: 28.6500, lng: 77.2000 } },
    { id: "FT-03", status: "available", location: { lat: 28.6250, lng: 77.2300 } },
    { id: "FT-04", status: "available", location: { lat: 28.6400, lng: 77.1950 } }
  ],
  police: [
    { id: "PCR-01", status: "available", location: { lat: 28.6300, lng: 77.2200 } },
    { id: "PCR-02", status: "available", location: { lat: 28.6450, lng: 77.2100 } }
  ]
};