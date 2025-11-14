import React from "react";
import "./AttractionList.css";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1730819176753-3a283f6310bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob25nJTIwa29uZyUyMGxhbnRhdSUyMGJ1ZGRoYXxlbnwxfHx8fDE3NjIzMjU2ODh8MA&ixlib=rb-4.1.0&q=80&w=1080";

const AttractionList = ({ attractions }) => {
  if (!attractions || attractions.length === 0)
    return <p>No nearby attractions found.</p>;

  return (
    <div className="cards">
      {attractions.map((a, i) => (
        <div key={i} className="card">
          <img
            src={a.Image || PLACEHOLDER_IMG}
            alt={a.Attraction}
            className="card-img"
          />
          <h3>{a.Attraction}</h3>
          <p className="description">{a.Description}</p>
          <p>
            <strong>Address:</strong> {a.Address}
          </p>
          {a.Website && (
            <a
              href={a.Website}
              target="_blank"
              rel="noreferrer"
              className="btn"
            >
              Check it out
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

export default AttractionList;
