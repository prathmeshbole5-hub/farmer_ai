/* ==========================================================================
   weatherService.js - Fetching, Caching, Geolocation & Real-Time Weather API
   ========================================================================== */

let weatherCache = {
  data: null,
  locationName: "Gorakhpur, Uttar Pradesh",
  timestamp: null
};

// Default coordinates (Gorakhpur, UP)
let weatherCoords = { lat: 26.7606, lon: 83.3731 };
let weatherRefreshInterval = null;

// Reverse Geocoding via OSM Nominatim (Coordinates -> Place Name)
const reverseGeocode = async (lat, lon) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'KrishiMitra-AI-Agriculture-App'
      }
    });
    if (!response.ok) throw new Error("Reverse geocoding failed");
    
    const data = await response.json();
    const addr = data.address;
    
    // Build a nice user-facing village/city name
    const village = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet;
    const city = addr.city || addr.town || addr.county;
    const state = addr.state;
    
    if (village && city) {
      return `${village}, ${city}`;
    } else if (city) {
      return `${city}, ${state || ''}`;
    } else {
      return data.display_name.split(',').slice(0, 3).join(',');
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
  }
};

// Forward Geocoding via OSM Nominatim (Search query -> Coordinates & Place Name)
const forwardGeocode = async (query) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'KrishiMitra-AI-Agriculture-App'
      }
    });
    if (!response.ok) throw new Error("Geocoding search failed");
    
    const data = await response.json();
    if (data.length === 0) return null;
    
    const item = data[0];
    return {
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      name: item.display_name.split(',').slice(0, 3).join(',')
    };
  } catch (error) {
    console.error("Forward geocoding error:", error);
    throw error;
  }
};

// Get coordinates using browser Geolocation API
const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        let msg = "Location permission denied.";
        if (error.code === error.POSITION_UNAVAILABLE) msg = "Location information is unavailable.";
        if (error.code === error.TIMEOUT) msg = "Location request timed out.";
        reject(new Error(msg));
      },
      { timeout: 10000 }
    );
  });
};

// Fetch Live Weather & Air Quality from Open-Meteo
const fetchLiveWeather = async (lat, lon) => {
  try {
    // Open-Meteo Forecast Endpoint (Weather, hourly forecast, 7-day forecast)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,relative_humidity_2m_max,wind_speed_10m_max&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error("Failed to fetch weather forecast data");
    const weatherData = await weatherResponse.json();

    // Open-Meteo Air Quality Endpoint
    let aqiData = null;
    try {
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`;
      const aqiResponse = await fetch(aqiUrl);
      if (aqiResponse.ok) {
        aqiData = await aqiResponse.json();
      }
    } catch (e) {
      console.warn("Failed to load Air Quality details, continuing without it.", e);
    }

    // Process hourly list (next 24 hours starting from current hour index)
    const hourly = [];
    const currentHourStr = new Date().toISOString().substring(0, 13) + ":00";
    let startIndex = weatherData.hourly.time.findIndex(t => t >= currentHourStr);
    if (startIndex === -1) startIndex = 0;
    
    for (let i = startIndex; i < startIndex + 24; i++) {
      if (!weatherData.hourly.time[i]) break;
      hourly.push({
        time: new Date(weatherData.hourly.time[i]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        temp: Math.round(weatherData.hourly.temperature_2m[i]),
        rainProb: weatherData.hourly.precipitation_probability[i],
        humidity: weatherData.hourly.relative_humidity_2m[i],
        windSpeed: Math.round(weatherData.hourly.wind_speed_10m[i]),
        code: weatherData.hourly.weather_code[i]
      });
    }

    // Process daily list (7 days forecast)
    const daily = [];
    for (let i = 0; i < 7; i++) {
      if (!weatherData.daily.time[i]) break;
      daily.push({
        date: new Date(weatherData.daily.time[i]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        tempMax: Math.round(weatherData.daily.temperature_2m_max[i]),
        tempMin: Math.round(weatherData.daily.temperature_2m_min[i]),
        rainProb: weatherData.daily.precipitation_probability_max[i],
        humidity: weatherData.daily.relative_humidity_2m_max[i],
        windSpeed: Math.round(weatherData.daily.wind_speed_10m_max[i]),
        code: weatherData.daily.weather_code[i]
      });
    }

    // Map weather code to standard descriptions and emojis
    const weatherMap = mapWeatherCode(weatherData.current.weather_code);

    return {
      current: {
        temp: Math.round(weatherData.current.temperature_2m),
        feelsLike: Math.round(weatherData.current.apparent_temperature),
        humidity: weatherData.current.relative_humidity_2m,
        rainProb: weatherData.hourly.precipitation_probability[startIndex] || 0,
        windSpeed: Math.round(weatherData.current.wind_speed_10m),
        windDirection: mapWindDirection(weatherData.current.wind_direction_10m),
        pressure: Math.round(weatherData.current.pressure_msl),
        visibility: 10, // Open-Meteo doesn't provide visibility easily, default to 10 km
        uvIndex: Math.round(weatherData.daily.uv_index_max[0] || 0),
        cloudCover: weatherData.current.cloud_cover,
        sunrise: new Date(weatherData.daily.sunrise[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sunset: new Date(weatherData.daily.sunset[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        conditionText: weatherMap.text,
        emoji: weatherMap.emoji,
        aqi: aqiData ? Math.round(aqiData.current.us_aqi) : null,
        aqiText: aqiData ? getAQIDescription(aqiData.current.us_aqi) : null,
        weatherCode: weatherData.current.weather_code
      },
      hourly,
      daily
    };
  } catch (error) {
    console.error("Fetch weather API details failed:", error);
    throw error;
  }
};

// Weather Code mapping function based on WMO Weather Interpretation Codes (WW)
const mapWeatherCode = (code) => {
  const mapping = {
    0: { text: "Clear Sky", emoji: "☀️" },
    1: { text: "Mainly Clear", emoji: "🌤" },
    2: { text: "Partly Cloudy", emoji: "⛅" },
    3: { text: "Overcast", emoji: "☁️" },
    45: { text: "Foggy", emoji: "🌫" },
    48: { text: "Depositing Rime Fog", emoji: "🌫" },
    51: { text: "Light Drizzle", emoji: "🌦" },
    53: { text: "Moderate Drizzle", emoji: "🌦" },
    55: { text: "Dense Drizzle", emoji: "🌦" },
    61: { text: "Slight Rain", emoji: "🌧" },
    63: { text: "Moderate Rain", emoji: "🌧" },
    65: { text: "Heavy Rain", emoji: "🌧" },
    80: { text: "Slight Rain Showers", emoji: "🌦" },
    81: { text: "Moderate Rain Showers", emoji: "🌦" },
    82: { text: "Violent Rain Showers", emoji: "⛈" },
    95: { text: "Thunderstorm", emoji: "⛈" },
    96: { text: "Thunderstorm with Hail", emoji: "⛈" },
    99: { text: "Heavy Thunderstorm with Hail", emoji: "⛈" }
  };
  return mapping[code] || { text: "Cloudy", emoji: "☁️" };
};

const mapWindDirection = (degree) => {
  const sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degree / 45) % 8;
  return sectors[index];
};

const getAQIDescription = (aqi) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
};

// Save weather details to cache
const saveWeatherToCache = (data, locationName) => {
  weatherCache = {
    data,
    locationName,
    timestamp: new Date().getTime()
  };
  localStorage.setItem('km_weather_cache', JSON.stringify(weatherCache));
};

// Load weather details from cache
const loadWeatherFromCache = () => {
  const cached = localStorage.getItem('km_weather_cache');
  if (cached) {
    weatherCache = JSON.parse(cached);
    return weatherCache;
  }
  return null;
};

// Helper for relative time text
const getRelativeTimeString = (timeMs) => {
  if (!timeMs) return "Never";
  const now = new Date().getTime();
  const diffMinutes = Math.round((now - timeMs) / 60000);
  
  if (diffMinutes < 1) return "just now";
  if (diffMinutes === 1) return "1 minute ago";
  return `${diffMinutes} minutes ago`;
};
