import React from "react";
import "./WeatherCard.css";

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

  return (
    <div className="weather-card">
      <h2>Current Weather - {district}</h2>
      <p className="weather-icon">{isRaining ? "🌧️" : "☀️"}</p>
      <p>Temperature: {temp}</p>
      <p>Rainfall: {rainfall} mm</p>
    </div>
  );
};

export default WeatherCard;
