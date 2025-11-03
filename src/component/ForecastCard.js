import React from "react";
import "./ForecastCard.css";

const ForecastCard = ({ forecastData }) => {
  if (!forecastData || forecastData.length === 0)
    return <p>Loading 9-day forecast...</p>;

  // helper to format date
  const formatDate = (dateStr) => {
    // dateStr example: "20251028" → want "10/28"
    if (!dateStr || dateStr.length < 8) return "";
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${month}/${day}`;
  };

  return (
    <div className="forecast-container">
      <h2>9-Day Weather Forecast</h2>
      <div className="forecast-grid">
        {forecastData.map((day, index) => (
          <div key={index} className="forecast-day">
            <h3>
              {day.week}{" "}
              <span className="forecast-date">
                {formatDate(day.forecastDate)}
              </span>
            </h3>
            <p>
              {day.forecastMintemp.value}°C - {day.forecastMaxtemp.value}°C
            </p>
            <p className="forecast-weather">{day.forecastWeather}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForecastCard;
