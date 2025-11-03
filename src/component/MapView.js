import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Custom icons
const attractionIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
});

const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png",
  iconSize: [35, 35],
});

export default function MapWithPins({ mergedData }) {
  const [userLocation, setUserLocation] = useState(null);

  // Get user's current geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Default center = Hong Kong
  const center = [22.3193, 114.1694];

  return (
    <div style={{ height: "500px", width: "100%", marginTop: "20px" }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        />

        {/* Show all attractions from your dataset */}
        {mergedData.map((place, i) =>
          place.Latitude && place.Longitude ? (
            <Marker
              key={i}
              position={[place.Latitude, place.Longitude]}
              icon={attractionIcon}
            >
              <Popup>
                <b>{place.Attraction || "Unknown Attraction"}</b>
                <br />
                {place.Address || "No address available"}
              </Popup>
            </Marker>
          ) : null
        )}

        {/* Show user's current location */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>You are here!</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
