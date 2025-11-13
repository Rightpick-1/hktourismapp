import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import WeatherCard from "./component/WeatherCard";
import AttractionList from "./component/AttractionList";
import RecommendationCard from "./component/RecommendationCard";
import "./App.css";
import "leaflet/dist/leaflet.css";
import MapWithPins from "./component/MapView";
import ForecastCard from "./component/ForecastCard";
import ChatSidebar from "./component/ChatSidebar";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

function App() {
  const [userPos, setUserPos] = useState(null);
  const [weather, setWeather] = useState(null);
  const [data, setData] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [isRaining, setIsRaining] = useState(false);
  const [dist, setDist] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [fitnessData, setFitnessData] = useState([]);
  const [viewMode, setViewMode] = useState("attractions");
  const [forecast, setForecast] = useState([]);

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en"
        );
        const data = await res.json();
        setWeather(data);
        const rainfallData = data.rainfall?.data.find((d) =>
          d.place.toLowerCase().includes("cheung chau")
        );
        setIsRaining(rainfallData && rainfallData.max > 0);
      } catch (err) {
        console.error("Weather API error:", err);
      }
    };

    fetchWeather();
  }, []);

  //fprecast weather
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await fetch(
          "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=en"
        );
        const data = await res.json();
        setForecast(data.weatherForecast);
      } catch (err) {
        console.error("Forecast API error:", err);
      }
    };

    fetchForecast();
  }, []);

  // Parse CSV
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Parse CSV (tourism dataset)
        const csvPromise = new Promise((resolve) => {
          Papa.parse("/tourism1.csv", {
            download: true,
            header: true,
            complete: (result) => resolve(result.data),
          });
        });

        // Fetch JSON (parks & zoos dataset)
        const jsonPromise = fetch("/park.json").then((res) => res.json());

        const [csvData, jsonData] = await Promise.all([
          csvPromise,
          jsonPromise,
        ]);

        // Normalize JSON structure
        const normalizedJsonData = jsonData.features.map((f) => {
          const p = f.properties;
          return {
            Attraction: p.NameEN || "Unknown Park",
            Description: p.FacilityTypeEN || "Outdoor park area",
            Address: p.AddressEN || "",
            Latitude: parseFloat(p.LATITUDE),
            Longitude: parseFloat(p.LONGITUDE),
            Website: p.WebsiteEN || "",
            Type: "Outdoor",
          };
        });

        // Merge both datasets
        const combinedData = [...csvData, ...normalizedJsonData];

        console.log("✅ Combined dataset:", combinedData);
        setData(combinedData);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchFitnessData = async () => {
      try {
        const res = await fetch("/facility.json");
        const json = await res.json();
        const normalizedFitness = json.map((f) => ({
          Attraction: f.Title_en,
          Description: f.Route_en,
          Address: f.HowToAccess_en,
          Latitude: parseFloat(f.Latitude),
          Longitude: parseFloat(f.Longitude),
          Website: f.MapURL_en,
          Type: "Outdoor",
        }));
        setFitnessData(normalizedFitness);
      } catch (err) {
        console.error("Error loading fitness data:", err);
      }
    };

    fetchFitnessData();
  }, []);

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => console.error(err)
    );
  }, []);

  // Compute nearby attractions
  useEffect(() => {
    if (!userPos || data.length === 0) return;
    let filteredData = viewMode === "fitness" ? fitnessData : data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredData = filteredData.filter(
        (a) =>
          a.Address?.toLowerCase().includes(query) ||
          a.Attraction?.toLowerCase().includes(query)
      );
    }

    if (selectedDistrict) {
      const district = selectedDistrict.toLowerCase();
      filteredData = filteredData.filter((a) =>
        a.Address?.toLowerCase().includes(district)
      );
    }

    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    console.log("Distance to each attraction:");

    const nearbyAttractions = filteredData.filter((a) => {
      console.log(
        "Attraction:",
        a.Attraction,
        "Lat:",
        a.Latitude,
        "Lon:",
        a.Longitude
      );
      const lat = parseFloat(a.Latitude);
      const lon = parseFloat(a.Longitude);
      if (isNaN(lat) || isNaN(lon)) return false;
      const dist = getDistance(
        userPos.lat,
        userPos.lon,
        a.Latitude,
        a.Longitude
      );
      setDist(`Distance: ${dist.toFixed(2)}km`);

      console.log(dist);
      if (dist > 3) return false;

      // ✅ Filter indoor-only if raining
      if (isRaining && a.Type?.toLowerCase() !== "indoor") return false;

      return true;
    });

    setNearby(nearbyAttractions);

    // Set first attraction as recommendation (or use any scoring logic)
    if (nearbyAttractions.length > 0) setRecommendation(nearbyAttractions[0]);
  }, [
    userPos,
    data,
    fitnessData,
    viewMode,
    isRaining,
    searchQuery,
    selectedDistrict,
  ]);

  const isSearching = searchQuery.trim() !== "" || selectedDistrict !== "";
  const query = searchQuery.toLowerCase();
  const areaQuery = selectedDistrict.toLowerCase();

  const filteredNearby = isSearching
    ? nearby.filter(
        (a) =>
          (!query ||
            a.Address?.toLowerCase().includes(query) ||
            a.Attraction?.toLowerCase().includes(query)) &&
          (!areaQuery || a.Address?.toLowerCase().includes(areaQuery))
      )
    : nearby;

  const filteredRecommendation = isSearching
    ? filteredNearby.length > 0
      ? filteredNearby[0]
      : null
    : recommendation;
  if (!weather || !userPos) return <p className="loading">Loading...</p>;

  return (
    <div className="app-container">
      <div className="main-content">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="hero-section"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1646062142799-73dd49cf315a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob25nJTIwa29uZyUyMHNreWxpbmV8ZW58MXx8fHwxNzYyMjI3NTg1fDA&ixlib=rb-4.1.0&q=80&w=1080')`,
          }}
        >
          <div className="hero-overlay">
            <div className="hero-content">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="hero-title-wrapper"
              >
                <Sparkles
                  style={{ width: "2rem", height: "2rem", color: "#fcd34d" }}
                />
                <h1 className="hero-title">HK Tourism Recommender</h1>
              </motion.div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="hero-subtitle"
              >
                Discover the best attractions, routes, and hidden gems in Hong
                Kong
              </motion.p>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="hero-stats">
                  <div className="hero-stat-card">
                    <span className="hero-stat-label">Live Weather</span>
                    <p className="hero-stat-value">
                      {weather?.temperature?.data?.[0]?.value
                        ? `${weather.temperature.data[0].value}°C`
                        : "N/A"}
                    </p>
                  </div>

                  <div className="hero-stat-card">
                    <span className="hero-stat-label">Attractions</span>
                    <p className="hero-stat-value">
                      {data?.length ? `${data.length}+` : "0"}
                    </p>
                  </div>

                  <div className="hero-stat-card">
                    <span className="hero-stat-label">Districts</span>
                    <p className="hero-stat-value">5</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="controls">
          <input
            type="text"
            placeholder="Search area, attraction, or address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="district-dropdown"
          >
            <option value="">Select a district</option>
            <option value="Kowloon">Kowloon</option>
            <option value="Mong Kok">Mong Kok</option>
            <option value="Wong Tai Sin">Wong Tai Sin</option>
            <option value="Sham Shui Po">Sham Shui Po</option>
            <option value="Lantau">Lantau</option>
          </select>

          <button
            className="clear-btn"
            onClick={() => {
              setSearchQuery("");
              setSelectedDistrict("");
            }}
          >
            Clear Filters
          </button>
        </div>

        <div className="view-toggle">
          <button
            className={viewMode === "attractions" ? "active" : ""}
            onClick={() => setViewMode("attractions")}
          >
            Attractions
          </button>
          <button
            className={viewMode === "fitness" ? "active" : ""}
            onClick={() => setViewMode("fitness")}
          >
            Fitness Routes
          </button>
        </div>

        <MapWithPins mergedData={viewMode === "fitness" ? fitnessData : data} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="weather-card"
        >
          <WeatherCard district="Cheung Chau" weatherData={weather} />
        </motion.div>

        <ForecastCard forecastData={forecast} />

        <RecommendationCard
          attraction={filteredRecommendation}
          distance={dist}
        />

        <h2>Nearby Attractions</h2>
        <AttractionList attractions={filteredNearby} />
      </div>

      {/* Right-side chat bar */}
      <div className="chat-sidebar-container">
        <ChatSidebar userPos={userPos} viewMode={viewMode} />
      </div>
    </div>
  );
}

export default App;
