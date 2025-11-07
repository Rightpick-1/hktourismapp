// import React from "react";
// import "./WeatherCard.css";

// const WeatherCard = ({ district, weatherData }) => {
//   if (!weatherData) return null;

//   const tempData = weatherData.temperature?.data.find((d) =>
//     d.place.toLowerCase().includes(district.toLowerCase())
//   );
//   const rainfallData = weatherData.rainfall?.data.find((d) =>
//     d.place.toLowerCase().includes(district.toLowerCase())
//   );

//   const temp = tempData ? `${tempData.value}°C` : "--";
//   const rainfall = rainfallData ? rainfallData.max : "--";
//   const isRaining = rainfallData && rainfallData.max > 0;

//   return (
//     <div className="weather-card">
//       <h2>Current Weather - {district}</h2>
//       <p className="weather-icon">{isRaining ? "🌧️" : "☀️"}</p>
//       <p>Temperature: {temp}</p>
//       <p>Rainfall: {rainfall} mm</p>
//     </div>
//   );
// };

// export default WeatherCard;

import React from "react";
import "./WeatherCard.css";
import { Sun, CloudRain, Thermometer, Droplets } from "lucide-react";

const WeatherCard = ({ district, weatherData }) => {
  if (!weatherData) return null;

  const tempData = weatherData.temperature?.data.find((d) =>
    d.place.toLowerCase().includes(district.toLowerCase())
  );
  const rainfallData = weatherData.rainfall?.data.find((d) =>
    d.place.toLowerCase().includes(district.toLowerCase())
  );

  const temp = tempData ? `${tempData.value}°C` : "--";
  const rainfall = rainfallData ? rainfallData.max : "--";
  const isRaining = rainfallData && rainfallData.max > 0;

  const condition = isRaining ? "Raining" : "Sunny";

  return (
    <div className="weather-card">
      {/* Decorative background circles */}
      <div
        className="weather-bg-circle"
        style={{ top: "-50px", left: "-50px", width: "150px", height: "150px" }}
      ></div>
      <div
        className="weather-bg-circle"
        style={{
          bottom: "-60px",
          right: "-60px",
          width: "200px",
          height: "200px",
        }}
      ></div>

      <div className="weather-content">
        <div className="weather-header">
          <div>
            <h2 className="weather-title">Current Weather</h2>
            <p className="weather-district">{district}</p>
          </div>
          {isRaining ? (
            <CloudRain className="weather-icon" />
          ) : (
            <Sun className="weather-icon" />
          )}
        </div>

        <div className="weather-temp">
          <Thermometer className="weather-temp-icon" />
          <span className="weather-temp-value">{temp}</span>
        </div>

        <p className="weather-condition">
          {isRaining ? <CloudRain size={20} /> : <Sun size={20} />} {condition}
        </p>

        <div className="weather-stats">
          <div className="weather-stat">
            <Droplets className="weather-stat-icon" />
            <div>
              <span className="weather-stat-label">Rainfall</span>
              <span className="weather-stat-value">{rainfall} mm</span>
            </div>
          </div>

          <div className="weather-stat">
            <Thermometer className="weather-stat-icon" />
            <div>
              <span className="weather-stat-label">Temperature</span>
              <span className="weather-stat-value">{temp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
