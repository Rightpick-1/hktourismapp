import React from "react";
import "./RecommendationCard.css";

const PLACEHOLDER_IMG = "https://via.placeholder.com/300x180?text=No+Image";

const RecommendationCard = ({ attraction, distance }) => {
  if (!attraction) return null;

  return (
    <div className="recommendation-card">
      <h2>Recommended for You</h2>
      <img
        src={attraction.Image || PLACEHOLDER_IMG}
        alt={attraction.Attraction}
        className="rec-img"
      />
      <h3>{attraction.Attraction}</h3>
      <p className="description">{attraction.Description}</p>
      <p>
        <strong>Address:</strong> {attraction.Address}
      </p>
      <p>{distance}</p>
      {attraction.Website && (
        <a
          href={attraction.Website}
          target="_blank"
          rel="noreferrer"
          className="btn"
        >
          Check it out
        </a>
      )}
    </div>
  );
};

export default RecommendationCard;
