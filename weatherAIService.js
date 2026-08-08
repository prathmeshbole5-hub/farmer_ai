/* ==========================================================================
   weatherAIService.js - Crop-specific Farming Recommendations via Gemini AI
   ========================================================================== */

const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;

const callGeminiWeatherAPI = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Invalid Gemini API response structure");
    }
  } catch (error) {
    console.error("Gemini Weather AI call failed:", error);
    return null;
  }
};

// Generates crop-specific farming advice based on weather conditions
const fetchCropWeatherAdvisory = async (crop, weatherData, langCode) => {
  const current = weatherData.current;
  const tomorrow = weatherData.daily[1] || weatherData.daily[0];

  let langName = 'English';
  if (langCode === 'hi') langName = 'Hindi';
  else if (langCode === 'gu') langName = 'Gujarati';
  else if (langCode === 'mr') langName = 'Marathi';
  else if (langCode === 'pa') langName = 'Punjabi';

  const prompt = `You are a professional Indian agricultural consultant and agronomy expert.
Analyze the following weather details and generate specific farming recommendations for growing "${crop}" in ${langName} language.

Current Weather:
- Temperature: ${current.temp}°C (Feels like: ${current.feelsLike}°C)
- Humidity: ${current.humidity}%
- Rain Probability: ${current.rainProb}%
- Wind Speed: ${current.windSpeed} km/h (Direction: ${current.windDirection})
- UV Index: ${current.uvIndex}
- Cloud Coverage: ${current.cloudCover}%
- Air Quality Index: ${current.aqi} (${current.aqiText || 'N/A'})

Forecast for Tomorrow:
- Max Temperature: ${tomorrow.tempMax}°C, Min Temperature: ${tomorrow.tempMin}°C
- Rain Probability: ${tomorrow.rainProb}%
- Wind Speed: ${tomorrow.windSpeed} km/h

You MUST output your response as a valid, parsable JSON object. Do not include markdown code block syntax (like \`\`\`json) in your response, return raw JSON string only.
The JSON object must have these exact keys and values (written in ${langName} language):
{
  "advisory": "A 2-sentence summary of crop health suggestions under these weather conditions.",
  "watering": "Irrigation guidelines based on humidity, temperature, and rain likelihood (1 sentence).",
  "pesticide": "Pesticide spray recommendations (e.g. postpone if rain probability >50% or winds >15km/h; suggest humidity fungal controls) (1 sentence).",
  "fertilizer": "Fertilizer advice (e.g. avoid washing away during heavy downpours, or specify application in sunny breaks) (1 sentence).",
  "harvest": "Harvesting advice (e.g. harvest ready crops immediately if storm approaches, or delay if moisture is high) (1 sentence).",
  "riskLevel": "Safe" or "Caution" or "Danger",
  "riskReason": "One brief reason explaining why you assigned this risk level."
}

Ensure the values are clear, simple, and direct for a rural farmer. Do not output anything other than this JSON structure.`;

  const responseText = await callGeminiWeatherAPI(prompt);
  
  if (responseText) {
    try {
      // Clean up response text if it contains markdown code blocks
      const cleanJson = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn("Failed to parse AI Weather advice JSON:", responseText, e);
    }
  }
  
  // Return localized fallbacks if API fails
  return getFallbackAdvisory(crop, current.rainProb, current.humidity, langCode);
};

// Localized fallback recommendations when offline or API fails
const getFallbackAdvisory = (crop, rainProb, humidity, langCode) => {
  const isHighRain = rainProb > 50;
  const isHighHumidity = humidity > 75;

  if (langCode === 'hi') {
    return {
      advisory: `मौसम विश्लेषण: ${crop} के लिए सावधानी बरतें। वर्तमान स्थिति में फसल प्रबंधन के लिए नीचे दी गई सलाह का पालन करें।`,
      watering: isHighRain ? "बारिश होने की संभावना है, इसलिए सिंचाई रोक दें।" : "मध्यम सिंचाई करें, नमी बनाए रखें।",
      pesticide: isHighRain ? "तेज हवाओं या बारिश में कीटनाशक का छिड़काव न करें, यह बह जाएगा।" : "छिड़काव के लिए धूप का इंतजार करें।",
      fertilizer: isHighRain ? "तेज वर्षा की स्थिति में खाद न डालें, पानी के बहाव से उर्वरक नष्ट हो सकता है।" : "उचित मात्रा में जैविक खाद डालें।",
      harvest: isHighRain ? "परिपक्व फसलों की कटाई तुरंत कर सुरक्षित स्थान पर रखें।" : "फसलों की कटाई सामान्य रूप से जारी रख सकते हैं।",
      riskLevel: isHighRain ? "Caution" : "Safe",
      riskReason: isHighRain ? "उच्च बारिश की संभावना फसल को प्रभावित कर सकती है।" : "मौसम फसल के लिए अनुकूल है।"
    };
  } else {
    // English fallback
    return {
      advisory: `Weather analysis: Take care of your ${crop} crops. Under current weather conditions, follow the instructions below.`,
      watering: isHighRain ? "High rain probability, suspend all irrigation today." : "Maintain normal irrigation patterns based on soil moisture.",
      pesticide: isHighRain ? "Postpone pesticide sprays today to prevent chemical run-off from rainfall." : "Weather is clear. You can proceed with scheduled pesticide spraying.",
      fertilizer: isHighRain ? "Avoid applying urea or top-dressing fertilizers now as rain will wash it away." : "Apply recommended fertilizers in dry soil.",
      harvest: isHighRain ? "Harvest mature crops immediately to protect them from potential rain damage." : "Continue harvesting ready crops normally.",
      riskLevel: isHighRain ? "Caution" : "Safe",
      riskReason: isHighRain ? "High chance of rain may impact operations." : "Weather parameters are stable for farming."
    };
  }
};
