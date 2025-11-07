// server.js
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import Papa from "papaparse";
import fetch from "node-fetch";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
console.log(
  "DeepSeek API Key loaded:",
  process.env.DEEPSEEK_API_KEY ? "Yes" : "No"
);
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- load and normalize datasets once on startup ----------
const PUBLIC = path.join(__dirname, "../public");
console.log("PUBLIC path:", PUBLIC);
console.log("Park file path:", path.join(PUBLIC, "park.json"));
console.log("Facility file path:", path.join(PUBLIC, "facility.json"));

// 1) load CSV (tourism1.csv) from public/
const csvRaw = fs.readFileSync(path.join(PUBLIC, "tourism1.csv"), "utf8");
const csvParsed = Papa.parse(csvRaw, { header: true }).data;

// 2) load parks geojson/park.json
const parkRaw = fs.readFileSync(path.join(PUBLIC, "park.json"), "utf8");
console.log("First 200 chars of park.json:\n", parkRaw.slice(0, 200));

const parkJson = JSON.parse(
  fs.readFileSync(path.join(PUBLIC, "park.json"), "utf8")
);

// 3) load fitness routes (facility.json)
const facilityPath = path.join(PUBLIC, "facility.json");
const fitnessRaw = fs.readFileSync(facilityPath, "utf8");
console.log("Facility file path:", facilityPath);
console.log("First 200 chars of facility.json:\n", fitnessRaw.slice(0, 200));

let fitnessJson;
try {
  fitnessJson = JSON.parse(fitnessRaw.trim());
} catch (e) {
  console.error("❌ Error parsing facility.json:", e.message);
  console.log("Raw content preview:", fitnessRaw.slice(0, 300));
  process.exit(1);
}

// normalize function to common schema
function normalizeCsvItem(r) {
  return {
    id: `csv-${
      r.Attraction ?? r.Name ?? Math.random().toString(36).slice(2, 8)
    }`,
    source: "tourism_csv",
    name: r.Attraction ?? r.Name ?? "",
    description: r.Description ?? r.FacilityType ?? "",
    address: r.Address ?? "",
    latitude: Number(r.Latitude),
    longitude: Number(r.Longitude),
    website: r.Website ?? r.WebsiteEN ?? "",
    type: (r.Type ?? "").toLowerCase() || null,
  };
}
function normalizeParkFeature(f) {
  const p = f.properties || {};
  return {
    id: `park-${p.OBJECTID ?? Math.random().toString(36).slice(2, 8)}`,
    source: "park",
    name: p.NameEN ?? p.DATASET_EN ?? "Park",
    description: p.FacilityTypeEN ?? "",
    address: p.AddressEN ?? "",
    latitude: Number(p.LATITUDE),
    longitude: Number(p.LONGITUDE),
    website: p.WebsiteEN ?? "",
    type: "outdoor",
  };
}
function normalizeFitnessItem(f) {
  return {
    id: `fit-${(f.Title_en || "fit").replace(/\s+/g, "-").toLowerCase()}`,
    source: "fitness",
    name: f.Title_en,
    description: (f.Route_en || "").replace(/<br>/g, " "),
    address: f.HowToAccess_en || "",
    latitude: Number(f.Latitude),
    longitude: Number(f.Longitude),
    website: f.MapURL_en || "",
    type: "outdoor",
  };
}

const csvItems = csvParsed
  .map(normalizeCsvItem)
  .filter((i) => !isNaN(i.latitude) && !isNaN(i.longitude));
const parks = (parkJson.features || [])
  .map(normalizeParkFeature)
  .filter((i) => !isNaN(i.latitude) && !isNaN(i.longitude));
const fitness = (
  Array.isArray(fitnessJson) ? fitnessJson : fitnessJson.features || []
)
  .map(normalizeFitnessItem)
  .filter((i) => !isNaN(i.latitude) && !isNaN(i.longitude));

const allAttractions = [...csvItems, ...parks];

// ---------- helper functions ----------
function toRad(x) {
  return (x * Math.PI) / 180;
}
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// simple district center mapping (you can expand)
const districtCenters = {
  "mong kok": { lat: 22.318, lon: 114.1708 },
  mongkok: { lat: 22.318, lon: 114.1708 },
  kowloon: { lat: 22.3193, lon: 114.1694 },
  central: { lat: 22.2819, lon: 114.158 },
  // add more as needed
};

// ---------- retrieval ----------
function retrieveByQuery({ text, userLat, userLon, viewMode = "attractions" }) {
  const q = (text || "").toLowerCase();

  // 1) try to detect district keyword in query
  const matchedDistrict = Object.keys(districtCenters).find((d) =>
    q.includes(d)
  );
  let origin = null;
  if (matchedDistrict) origin = districtCenters[matchedDistrict];
  else if (userLat && userLon) origin = { lat: userLat, lon: userLon };

  // choose dataset
  const dataset = viewMode === "fitness" ? fitness : [...csvItems, ...parks];

  // 2) compute distance and simple text score
  const scored = dataset.map((item) => {
    const dist = origin
      ? haversine(origin.lat, origin.lon, item.latitude, item.longitude)
      : null;
    // text score: 1 if name or address contains query tokens
    const nameAddr =
      `${item.name} ${item.address} ${item.description}`.toLowerCase();
    let textScore = 0;
    if (q.length > 0) {
      if (nameAddr.includes(q)) textScore = 1;
      else {
        const tokens = q.split(/\s+/);
        const matches = tokens.reduce(
          (c, t) => c + (nameAddr.includes(t) ? 1 : 0),
          0
        );
        textScore = matches / tokens.length;
      }
    }
    return { item, dist, textScore };
  });

  scored.sort((a, b) => {
    if (a.dist !== null && b.dist !== null) {
      const d = a.dist - b.dist;
      if (Math.abs(d) > 0.1) return d;
    }

    return b.textScore - a.textScore;
  });

  const top = scored.slice(0, 6).filter((s) => s.dist === null || s.dist < 25);
  return top.map((s) => ({
    id: s.item.id,
    name: s.item.name,
    address: s.item.address,
    description: s.item.description,
    website: s.item.website,
    type: s.item.type,
    distance_km: s.dist === null ? null : Number(s.dist.toFixed(2)),
    source: s.item.source,
  }));
}

function generateFallbackResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  const hasParks =
    lowerPrompt.includes("park") || lowerPrompt.includes("outdoor");
  const hasMuseums =
    lowerPrompt.includes("museum") || lowerPrompt.includes("cultural");
  const hasShopping =
    lowerPrompt.includes("shop") || lowerPrompt.includes("mall");
  const hasFood =
    lowerPrompt.includes("restaurant") ||
    lowerPrompt.includes("food") ||
    lowerPrompt.includes("eat");
  const hasFitness =
    lowerPrompt.includes("fitness") ||
    lowerPrompt.includes("exercise") ||
    lowerPrompt.includes("workout");

  let response =
    "As your Hong Kong travel assistant, here are my recommendations:\n\n";

  if (hasParks) {
    response +=
      "• **Victoria Park** - Large urban park with sports facilities and walking paths\n";
    response +=
      "• **Hong Kong Park** - Beautiful green space with aviary and tai chi garden\n";
    response +=
      "• **Kowloon Park** - Great for leisurely walks and bird watching\n\n";
  }

  if (hasMuseums) {
    response +=
      "• **Hong Kong Museum of History** - Learn about Hong Kong's rich heritage\n";
    response +=
      "• **Hong Kong Science Museum** - Interactive exhibits for all ages\n";
    response +=
      "• **Hong Kong Art Museum** - Featuring local and international artists\n\n";
  }

  if (hasShopping) {
    response += "• **Causeway Bay** - Department stores and trendy boutiques\n";
    response += "• **Mong Kok** - Vibrant street markets and local shops\n";
    response +=
      "• **Tsim Sha Tsui** - Luxury brands and harborfront shopping\n\n";
  }

  if (hasFood) {
    response +=
      "• **Temple Street Night Market** - Authentic local street food\n";
    response +=
      "• **Central District** - International cuisine and fine dining\n";
    response += "• **Yau Ma Tei** - Traditional Cantonese restaurants\n\n";
  }

  if (hasFitness) {
    response +=
      "• **Bowen Road Fitness Trail** - Scenic outdoor exercise stations\n";
    response +=
      "• **Victoria Peak Circuit** - Beautiful walking trail with city views\n";
    response +=
      "• **Dragon's Back Hike** - Popular hiking trail with coastal views\n\n";
  }

  if (!hasParks && !hasMuseums && !hasShopping && !hasFood && !hasFitness) {
    response += "• **Victoria Peak** - Stunning panoramic views of Hong Kong\n";
    response += "• **Star Ferry** - Iconic harbor crossing experience\n";
    response += "• **Ngong Ping 360** - Cable car ride and cultural village\n";
    response += "• **Ocean Park** - Marine life and amusement rides\n";
    response +=
      "• **Temple Street Night Market** - Local food and shopping experience\n\n";
  }

  response +=
    "For specific details about opening hours, locations, and current events, please check the official websites of these attractions.";

  return response;
}

// ---------- DeepSeek API helper ----------
async function callDeepSeekAPI(prompt) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    throw new Error(
      "DeepSeek API key not found. Please set the DEEPSEEK_API_KEY environment variable."
    );
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: false,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error(
          "Insufficient balance in your DeepSeek account. Please top up."
        );
      }
      const errorData = await response.json();
      throw new Error(
        `DeepSeek API error: ${response.status} - ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error("Error calling DeepSeek API:", err.message);
    return generateFallbackResponse(prompt);
  }
}

app.get("/", (req, res) => {
  res.send("✅ Server is running fine! Try POSTing to /api/chat instead.");
});

app.post("/api/chat", async (req, res) => {
  try {
    console.log("✅ /api/chat endpoint hit");
    console.log("Request body:", req.body);
    const { message, userLat, userLon, viewMode } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    // retrieve relevant items
    const retrieved = retrieveByQuery({
      text: message,
      userLat,
      userLon,
      viewMode,
    });

    console.log("Retrieved items:", retrieved.length);

    // Build a more flexible prompt that allows AI to use its own knowledge
    let contextText = "";
    if (retrieved.length > 0) {
      contextText = "Here are some relevant places from our database:\n";
      retrieved.forEach((r) => {
        contextText += `- ${r.name} | ${r.type || "unknown"} | ${
          r.distance_km ?? "?"
        } km | ${r.address} | ${r.website || "-"}\n`;
      });
      contextText += "\n";
    }

    const systemPrompt = `You are a friendly and knowledgeable Hong Kong travel assistant. 

INSTRUCTIONS:
1. Use your general knowledge about Hong Kong tourism, weather patterns, crowd levels, and seasonal trends to answer questions
2. When the user asks about specific places in our database (listed above), incorporate that information
3. For general questions (weather, crowds, best times to visit, etc.), use your own expertise
4. Provide practical, helpful advice for tourists
5. If you mention specific attractions from our database, include their practical details
6. Be conversational but informative

Current context: ${contextText || "No specific locations found in database"}

User question: ${message}

Please provide a helpful response that combines your Hong Kong knowledge with any relevant location data above.`;

    console.log("Calling DeepSeek API...");
    const aiReply = await callDeepSeekAPI(systemPrompt);

    console.log("AI Reply:", aiReply);

    if (!aiReply) {
      return res.json({
        reply: "I couldn't generate a response. Please try again.",
        retrieved,
      });
    }

    return res.json({ reply: aiReply, retrieved });
  } catch (err) {
    console.error("❌ Error in /api/chat:", err);
    res.status(500).json({ error: err.message });
  }
});

// start
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Server running on", PORT));
