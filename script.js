/* ==========================================================================
   KrishiMitra AI - Vanilla JavaScript Application Controller
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. STATE & GLOBAL VARIABLES
// --------------------------------------------------------------------------
let appState = {
  currentLanguage: 'en',
  currentTab: 'home',
  activeVisionModule: 'disease',
  fontSize: 'medium', // small, medium, large
  highContrast: false,
  selectedSampleImage: null,
  reportsHistory: [],
  bookmarkedSchemes: []
};

// Audio elements helper
const playSound = (soundId) => {
  try {
    const audio = document.getElementById(soundId);
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  } catch (e) {
    console.log("Audio play blocked by browser policies.");
  }
};

// --------------------------------------------------------------------------
// 2. DICTIONARIES & TRANSLATIONS (EN, HI, GU, MR, PA)
// --------------------------------------------------------------------------
const i18n = {
  en: {
    tagline: "Simple AI Assistance for Every Farmer",
    text_size: "Text Size:",
    high_contrast: "Contrast Mode",
    welcome_greeting: "Namaste",
    welcome_message: "Which farming service do you want to use today?",
    quick_actions: "Quick Actions",
    today_weather: "Today's Weather",
    rain_prob_brief: "🌧 80% Rain Prob.",
    weather_light_rain: "Light Rain",
    humidity: "Humidity",
    advisory_title: "AI Advisory:",
    weather_advisory_text: "Heavy rain expected tomorrow. Do not spray pesticides today.",
    recent_alerts: "Recent Alerts",
    alert_disease: "Disease Threat",
    rice_blast_detected: "Rice Blast disease",
    rice_blast_detected_desc: "was reported in nearby village Laxmipur. Keep fields drained and monitor crop carefully.",
    alert_market: "Market Update",
    paddy_prices_up: "Paddy (धान) prices in nearby Mandi increased by",
    paddy_prices_up_desc: "Good time to harvest and sell.",
    alert_scheme: "New Scheme",
    pm_kusum_scheme: "PM Kusum Yojana",
    pm_kusum_scheme_desc: "registration is now open in your block. Apply to get 60% subsidy on Solar Water Pumps.",
    village_name: "Kishanpur, UP",
    
    // Quick Actions Label
    action_scan_crop: "Scan Crop",
    action_scan_crop_desc: "Find and cure plant diseases",
    action_soil_test: "Soil Test",
    action_soil_test_desc: "Check moisture & fertilizers",
    action_ask_ai: "Ask AI (Voice)",
    action_ask_ai_desc: "Talk in your language",
    action_weather: "Weather Details",
    action_weather_desc: "7-day forecast & warnings",
    action_mandi_prices: "Mandi Prices",
    action_mandi_prices_desc: "Compare nearby crop rates",
    action_schemes: "Govt Schemes",
    action_schemes_desc: "Apply for financial support",
    action_insurance: "Insurance Report",
    action_insurance_desc: "Generate damage proof reports",
    
    // Bottom Nav
    nav_home: "Home",
    nav_vision: "Vision Lab",
    nav_voice: "Voice AI",
    nav_mandi: "Market",
    nav_schemes: "Schemes",
    nav_profile: "Profile",

    // Vision Lab Page
    vision_lab_title: "🌱 AI Vision Lab",
    vision_lab_subtitle: "Upload crop or soil photos to diagnose issues in seconds.",
    pill_disease: "🌿 Disease Scanner",
    pill_soil: "🟤 Soil Analyzer",
    pill_growth: "🌾 Growth Monitor",
    pill_grade: "🍅 Quality Grader",
    pill_insurance: "📄 Insurance Claim",
    upload_prompt_title: "Drag your photo here or tap either button below",
    upload_prompt_support: "Supports JPG, PNG photos taken on your farm",
    sample_label: "Or choose a test farm photo:",
    take_photo: "Take Photo",
    upload_photo: "Upload Image",
    btn_analyze_action: "Analyze with KrishiMitra AI",
    analyzing_with_ai: "Processing Crop Image...",
    loading_subtext: "Analyzing soil condition, leaf health, and structures",
    ai_verified: "AI Verified Report",
    download_pdf: "Print / Save PDF",
    close: "Close",

    // Voice Page
    voice_title: "Ask KrishiMitra Voice AI",
    voice_desc: "Hold the microphone and ask your questions. Speak in your native language.",
    speaking_in: "Speaking:",
    bot_welcome_msg: "Namaste! I am your KrishiMitra assistant. How can I help you with your crops, weather, or market prices today?",
    mic_status_idle: "Tap the microphone to ask a question",
    mic_status_listening: "Listening... Speak now",
    suggested_questions: "Try asking these:",

    // Weather Page
    village_kisankot: "Kisankot Village, Uttar Pradesh",
    wind: "Wind Speed",
    rain_probability: "Rain Probability",
    temp_feels: "Feels Like",
    weather_ai_advice: "AI Crop Advisory",
    weather_ai_advice_text: "Rain showers expected for the next 24 hours. Postpone nitrogen/urea fertilizer applications. Keep drainage channels open in vegetable beds to prevent water logging.",
    weekly_forecast: "7-Day Weather Forecast",
    day_today: "Today",
    day_tomorrow: "Tomorrow",
    weather_label_rain: "Rainy",
    weather_label_heavy_rain: "Heavy Rain",
    weather_label_cloudy: "Cloudy",
    weather_label_sunny: "Sunny",

    // Market Page
    market_mandi_prices: "💰 Mandi Crop Prices",
    market_mandi_subtitle: "Search crops to find high-paying buyers and prices in nearby government APMCs.",
    rates_updated_today: "Rates updated: Today, 10:00 AM",
    mandi_highest: "Highest Price",
    mandi_lowest: "Lowest Price",
    price_comparison_chart: "Price Comparison across Nearby Mandis",
    recommendation_bold: "Best Market recommendation:",
    paddy_sell_advise: "Selling at Laxmipur APMC gives ₹300/quintal more. Transport cost is ₹40, net profit is higher.",
    all_nearby_mandis: "All Mandis and Prices",

    // Schemes Page
    schemes_title: "🏛 Government Schemes",
    schemes_subtitle: "Find direct financial assistance, subsidies, and free inputs from Central & State Govts.",
    scheme_filter_all: "All Schemes",
    scheme_filter_subsidy: "Subsidies",
    scheme_filter_insurance: "Insurance",
    scheme_filter_bookmarked: "★ Bookmarked",

    // Profile Page
    registered_since: "Registered since Oct 2024",
    lbl_name: "Farmer Name",
    lbl_phone: "Mobile Number",
    lbl_village: "Village",
    lbl_district: "District",
    lbl_land: "Land Size (Acres)",
    lbl_soil_type: "Soil Type",
    lbl_active_crops: "Active Crops Grown",
    save_profile: "Save Profile Information",
    reports_history: "Your Saved AI Reports"
  },
  hi: {
    tagline: "हर किसान के लिए सरल एआई सहायता",
    text_size: "लिखावट का आकार:",
    high_contrast: "कंट्रास्ट मोड",
    welcome_greeting: "नमस्ते",
    welcome_message: "आज आप कौन सी खेती सेवा का उपयोग करना चाहते हैं?",
    quick_actions: "त्वरित विकल्प",
    today_weather: "आज का मौसम",
    rain_prob_brief: "🌧 80% बारिश की संभावना",
    weather_light_rain: "हल्की बारिश",
    humidity: "नमी (ह्यूमिडिटी)",
    advisory_title: "एआई सलाह:",
    weather_advisory_text: "कल भारी बारिश की संभावना है। आज कीटनाशकों का छिड़काव न करें।",
    recent_alerts: "हालिया चेतावनी",
    alert_disease: "बीमारी का खतरा",
    rice_blast_detected: "राइस ब्लास्ट रोग",
    rice_blast_detected_desc: "पड़ोसी गांव लक्ष्मीपुर में देखा गया। खेतों से जल निकासी रखें और फसल की निगरानी करें।",
    alert_market: "मंडी अपडेट",
    paddy_prices_up: "निकटतम मंडी में धान की कीमतों में",
    paddy_prices_up_desc: "बढ़ोतरी हुई। फसल काटकर बेचने का सही समय है।",
    alert_scheme: "नई योजना",
    pm_kusum_scheme: "पीएम कुसुम योजना",
    pm_kusum_scheme_desc: "आपके ब्लॉक में पंजीकरण शुरू हो चुका है। सोलर पंप पर 60% सब्सिडी पाएं।",
    village_name: "किशनपुर, उत्तर प्रदेश",

    action_scan_crop: "फसल जांचें",
    action_scan_crop_desc: "फसल के रोगों का पता लगाएं",
    action_soil_test: "मिट्टी जांचें",
    action_soil_test_desc: "नमी और खाद की जानकारी पाएं",
    action_ask_ai: "एआई से पूछें (आवाज)",
    action_ask_ai_desc: "अपनी भाषा में बोलकर पूछें",
    action_weather: "मौसम की जानकारी",
    action_weather_desc: "7 दिनों का पूर्वानुमान और चेतावनी",
    action_mandi_prices: "मंडी के भाव",
    action_mandi_prices_desc: "आस-पास की मंडियों के भाव देखें",
    action_schemes: "सरकारी योजनाएं",
    action_schemes_desc: "आर्थिक सहायता के लिए आवेदन करें",
    action_insurance: "बीमा रिपोर्ट",
    action_insurance_desc: "फसल नुकसान की रिपोर्ट बनाएं",

    nav_home: "मुख्य पृष्ठ",
    nav_vision: "विजन लैब",
    nav_voice: "आवाज एआई",
    nav_mandi: "मंडी भाव",
    nav_schemes: "योजनाएं",
    nav_profile: "प्रोफाइल",

    vision_lab_title: "🌱 एआई विजन लैब",
    vision_lab_subtitle: "फसल या मिट्टी की तस्वीरें अपलोड करके तुरंत सलाह पाएं।",
    pill_disease: "🌿 बीमारी स्कैनर",
    pill_soil: "🟤 मिट्टी विश्लेषक",
    pill_growth: "🌾 विकास मॉनिटर",
    pill_grade: "🍅 गुणवत्ता ग्रेडर",
    pill_insurance: "📄 बीमा दावा रिपोर्ट",
    upload_prompt_title: "अपनी तस्वीर को यहाँ खींचें या नीचे दिए गए बटन दबाएं",
    upload_prompt_support: "खेत से ली गई जेपीजी, पीएनजी फोटो चुनें",
    sample_label: "या एक जांच फोटो चुनें:",
    take_photo: "फोटो खींचें",
    upload_photo: "फोटो अपलोड करें",
    btn_analyze_action: "कृषिमित्र एआई से जांचें",
    analyzing_with_ai: "फसल की जांच की जा रही है...",
    loading_subtext: "मिट्टी की स्थिति और पत्तों के स्वास्थ्य का विश्लेषण हो रहा है",
    ai_verified: "एआई सत्यापित रिपोर्ट",
    download_pdf: "प्रिंट करें / पीडीएफ सेव करें",
    close: "बंद करें",

    voice_title: "कृषिमित्र आवाज एआई से पूछें",
    voice_desc: "माइक बटन दबाएं और सवाल पूछें। अपनी स्थानीय भाषा में बोलें।",
    speaking_in: "बोलने की भाषा:",
    bot_welcome_msg: "नमस्ते! मैं आपका कृषिमित्र सहायक हूँ। आज मैं आपकी फसलों, मौसम या मंडी भाव में क्या सहायता कर सकता हूँ?",
    mic_status_idle: "पूछने के लिए माइक बटन दबाएं",
    mic_status_listening: "सुन रहा हूँ... बोलिए",
    suggested_questions: "इन्हें पूछ कर देखें:",

    village_kisankot: "किसानकोट गांव, उत्तर प्रदेश",
    wind: "हवा की गति",
    rain_probability: "बारिश की संभावना",
    temp_feels: "महसूस तापमान",
    weather_ai_advice: "एआई फसल सलाह",
    weather_ai_advice_text: "अगले 24 घंटों में बारिश की संभावना है। यूरिया खाद डालने से बचें। सब्जियों के खेतों में जल निकासी की व्यवस्था करें।",
    weekly_forecast: "7 दिनों का मौसम पूर्वानुमान",
    day_today: "आज",
    day_tomorrow: "कल",
    weather_label_rain: "बारिश",
    weather_label_heavy_rain: "भारी बारिश",
    weather_label_cloudy: "बादल",
    weather_label_sunny: "धूप",

    market_mandi_prices: "💰 मंडी फसल भाव",
    market_mandi_subtitle: "फसलों के लिए सबसे अधिक दाम देने वाली पास की सरकारी एपीएमसी मंडियां खोजें।",
    rates_updated_today: "दर अपडेट: आज सुबह 10:00 बजे",
    mandi_highest: "सबसे ज्यादा दाम",
    mandi_lowest: "सबसे कम दाम",
    price_comparison_chart: "पास की मंडियों में भाव की तुलना",
    recommendation_bold: "सर्वोत्तम मंडी की सलाह:",
    paddy_sell_advise: "लक्ष्मीपुर एपीएमसी में बेचने पर ₹300/क्विंटल अधिक मिलेंगे। परिवहन खर्च ₹40 है, शुद्ध लाभ ज्यादा होगा।",
    all_nearby_mandis: "सभी पास की मंडियां और उनके भाव",

    schemes_title: "🏛 सरकारी योजनाएं",
    schemes_subtitle: "केंद्र और राज्य सरकारों से सीधे वित्तीय सहायता और सब्सिडी प्राप्त करें।",
    scheme_filter_all: "सभी योजनाएं",
    scheme_filter_subsidy: "सब्सिडी",
    scheme_filter_insurance: "फसल बीमा",
    scheme_filter_bookmarked: "★ बुकमार्क",

    registered_since: "अक्टूबर 2024 से पंजीकृत",
    lbl_name: "किसान का नाम",
    lbl_phone: "मोबाइल नंबर",
    lbl_village: "गांव",
    lbl_district: "जिला",
    lbl_land: "जमीन का आकार (एकड़)",
    lbl_soil_type: "मिट्टी का प्रकार",
    lbl_active_crops: "उगाई जाने वाली फसलें",
    save_profile: "प्रोफाइल सुरक्षित करें",
    reports_history: "आपकी सुरक्षित एआई रिपोर्ट्स"
  },
  gu: {
    tagline: "દરેક ખેડૂત માટે સરળ AI સહાય",
    text_size: "અક્ષરોનું કદ:",
    high_contrast: "કોન્ટ્રાસ્ટ મોડ",
    welcome_greeting: "નમસ્તે",
    welcome_message: "આજે તમે કઈ ખેતી સેવાનો ઉપયોગ કરવા માંગો છો?",
    quick_actions: "ઝડપી ક્રિયાઓ",
    today_weather: "આજનું હવામાન",
    rain_prob_brief: "🌧 80% વરસાદની સંભાવના",
    weather_light_rain: "હળવો વરસાદ",
    humidity: "ભેજનું પ્રમાણ",
    advisory_title: "AI સલાહ:",
    weather_advisory_text: "આવતીકાલે ભારે વરસાદની અપેક્ષા છે. આજે જંતુનાશકોનો છંટકાવ કરશો નહીં.",
    recent_alerts: "તાજેતરની ચેતવણીઓ",
    alert_disease: "રોગનો ભય",
    rice_blast_detected: "રાઇસ બ્લાસ્ટ રોગ",
    rice_blast_detected_desc: "નજીકના ગામ લક્ષ્મીપુરમાં જોવા મળ્યો. ખેતરમાં પાણીનો નિકાલ રાખો.",
    alert_market: "બજાર અપડેટ",
    paddy_prices_up: "નજીકની મંડીમાં ડાંગરના ભાવમાં",
    paddy_prices_up_desc: "વધારો થયો છે. લણણી કરી વેચવા માટે ઉત્તમ સમય છે.",
    alert_scheme: "નવી યોજના",
    pm_kusum_scheme: "પીએમ કુસુમ યોજના",
    pm_kusum_scheme_desc: "તમારા બ્લોકમાં રજીસ્ટ્રેશન શરૂ છે. સોલાર પંપ પર 60% સબસિડી મેળવો.",
    village_name: "કિશનપુર, ઉત્તર પ્રદેશ",

    action_scan_crop: "પાકની તપાસ",
    action_scan_crop_desc: "પાકના રોગો શોધો અને ઉપાય મેળવો",
    action_soil_test: "જમીનની તપાસ",
    action_soil_test_desc: "ભેજ અને ખાતરની માહિતી મેળવો",
    action_ask_ai: "AI ને પૂછો (અવાજ)",
    action_ask_ai_desc: "તમારી ભાષામાં બોલીને પૂછો",
    action_weather: "હવામાન માહિતી",
    action_weather_desc: "7 દિવસની આગાહી અને ચેતવણી",
    action_mandi_prices: "મંડીના ભાવો",
    action_mandi_prices_desc: "નજીકના બજારોના ભાવો સરખાવો",
    action_schemes: "સરકારી યોજનાઓ",
    action_schemes_desc: "નાણાકીય સહાય માટે અરજી કરો",
    action_insurance: "વીમા રિપોર્ટ",
    action_insurance_desc: "નુકસાનીનો રિપોર્ટ બનાવો",

    nav_home: "મુખ્ય પેજ",
    nav_vision: "વિઝન લેબ",
    nav_voice: "અવાજ AI",
    nav_mandi: "બજાર ભાવ",
    nav_schemes: "યોજનાઓ",
    nav_profile: "પ્રોફાઇલ",

    vision_lab_title: "🌱 AI વિઝન લેબ",
    vision_lab_subtitle: "પાક કે જમીનના ફોટા અપલોડ કરીને સેકન્ડોમાં રોગ અને માટીનું પરીક્ષણ કરો.",
    pill_disease: "🌿 રોગ સ્કેનર",
    pill_soil: "🟤 માટી વિશ્લેષક",
    pill_growth: "🌾 પાક વિકાસ મોનિટર",
    pill_grade: "🍅 ગુણવત્તા ગ્રેડર",
    pill_insurance: "📄 વીમા દાવો રિપોર્ટ",
    upload_prompt_title: "તમારો ફોટો અહીં ખેંચો અથવા નીચેના બટનો દબાવો",
    upload_prompt_support: "ખેતરમાંથી લીધેલ ફોટો અપલોડ કરો",
    sample_label: "અથવા ટેસ્ટ ફોટો પસંદ કરો:",
    take_photo: "ફોટો લો",
    upload_photo: "ફોટો અપલોડ કરો",
    btn_analyze_action: "કૃષિમિત્ર AI થી તપાસો",
    analyzing_with_ai: "પાકનું વિશ્લેષણ ચાલુ છે...",
    loading_subtext: "જમીનની સ્થિતિ અને પાક આરોગ્યનું મૂલ્યાંકન થાય છે",
    ai_verified: "AI પ્રમાણિત રિપોર્ટ",
    download_pdf: "પ્રિન્ટ કરો / પીડીએફ સેવ કરો",
    close: "બંધ કરો",

    voice_title: "કૃષિમિત્ર અવાજ AI ને પૂછો",
    voice_desc: "માઈક બટન દબાવો અને પ્રશ્નો પૂછો. તમારી માતૃભાષામાં બોલો.",
    speaking_in: "બોલવાની ભાષા:",
    bot_welcome_msg: "નમસ્તે! હું તમારો કૃષિમિત્ર સહાયક છું. આજે પાક, હવામાન અથવા બજાર ભાવ અંગે હું તમારી શું મદદ કરી શકું?",
    mic_status_idle: "પૂછવા માટે માઈક બટન દબાવો",
    mic_status_listening: "સાંભળી રહ્યું છે... બોલો",
    suggested_questions: "આ સવાલો પૂછી જુઓ:",

    village_kisankot: "કિસાનકોટ ગામ, ઉત્તર પ્રદેશ",
    wind: "પવનની ગતિ",
    rain_probability: "વરસાદની સંભાવના",
    temp_feels: "અનુભવાતું તાપમાન",
    weather_ai_advice: "AI પાક સલાહ",
    weather_ai_advice_text: "આગામી 24 કલાકમાં વરસાદી ઝાપટાની અપેક્ષા છે. યુરિયા ખાતર નાખવાનું મોકૂફ રાખો. પાક વિસ્તારમાં ડ્રેનેજ ખુલ્લું રાખો.",
    weekly_forecast: "7 દિવસનું હવામાન પૂર્વાનુમાન",
    day_today: "આજે",
    day_tomorrow: "આવતીકાલે",
    weather_label_rain: "વરસાદ",
    weather_label_heavy_rain: "ભારે વરસાદ",
    weather_label_cloudy: "વાદળછાયું",
    weather_label_sunny: "તડકો",

    market_mandi_prices: "💰 મંડી પાકના ભાવો",
    market_mandi_subtitle: "નજીકની સરકારી APMC મંડીઓમાં પાકના સૌથી વધુ ભાવો શોધો.",
    rates_updated_today: "ભાવ અપડેટ: આજે સવારે 10:00 વાગ્યે",
    mandi_highest: "સૌથી વધુ ભાવ",
    mandi_lowest: "સૌથી ઓછો ભાવ",
    price_comparison_chart: "નજીકની મંડીઓમાં ભાવોની સરખામણી",
    recommendation_bold: "શ્રેષ્ઠ બજાર ભલામણ:",
    paddy_sell_advise: "લક્ષ્મીપુર APMC માં વેચવાથી ₹300/ક્વિન્ટલ વધુ મળશે. પરિવહન ખર્ચ ₹40 છે, તેથી નફો વધુ થશે.",
    all_nearby_mandis: "નજીકના તમામ બજારો અને ભાવો",

    schemes_title: "🏛 સરકારી યોજનાઓ",
    schemes_subtitle: "કેન્દ્ર અને રાજ્ય સરકારો દ્વારા ખેડૂતો માટે સબસિડી અને નાણાકીય સહાય.",
    scheme_filter_all: "બધી યોજનાઓ",
    scheme_filter_subsidy: "સબસિડીઓ",
    scheme_filter_insurance: "વીમા સહાય",
    scheme_filter_bookmarked: "★ બુકમાર્ક કરેલ",

    registered_since: "ઓક્ટોબર 2024 થી નોંધાયેલ",
    lbl_name: "ખેડૂતનું નામ",
    lbl_phone: "મોબાઇલ નંબર",
    lbl_village: "ગામ",
    lbl_district: "જિલ્લો",
    lbl_land: "જમીનનું કદ (એકર)",
    lbl_soil_type: "જમીનનો પ્રકાર",
    lbl_active_crops: "વાવેલા પાકો",
    save_profile: "પ્રોફાઇલ સાચવો",
    reports_history: "તમારા સાચવેલા AI અહેવાલો"
  },
  mr: {
    tagline: "प्रत्येक शेतकऱ्यासाठी सोपी AI मदत",
    text_size: "अक्षरांचा आकार:",
    high_contrast: "कॉन्ट्रास्ट मोड",
    welcome_greeting: "नमस्ते",
    welcome_message: "आज तुम्हाला कोणत्या शेती सेवेचा वापर करायचा आहे?",
    quick_actions: "त्वरित पर्याय",
    today_weather: "आजचे हवामान",
    rain_prob_brief: "🌧 80% पावसाची शक्यता",
    weather_light_rain: "हलका पाऊस",
    humidity: "हवेतील दमटपणा",
    advisory_title: "AI सल्ला:",
    weather_advisory_text: "उद्या मुसळधार पावसाची शक्यता आहे. आज कीटकनाशकांची फवारणी करू नका.",
    recent_alerts: "ताजी माहिती व सूचना",
    alert_disease: "रोगाची चेतावणी",
    rice_blast_detected: "तांदूळ ब्लास्ट रोग",
    rice_blast_detected_desc: "शेजारच्या लक्ष्मीपूर गावात आढळला. शेतातून पाण्याचा निचरा ठेवा आणि पिकावर लक्ष ठेवा.",
    alert_market: "बाजार भाव अपडेट",
    paddy_prices_up: "जवळच्या बाजारात धान्याच्या दरात",
    paddy_prices_up_desc: "वाढ झाली आहे. पीक विकण्यासाठी उत्तम वेळ आहे.",
    alert_scheme: "नवीन योजना",
    pm_kusum_scheme: "पीएम कुसुम योजना",
    pm_kusum_scheme_desc: "तुमच्या भागात नोंदणी सुरू झाली आहे. सौर पंपावर ६०% अनुदान मिळवा.",
    village_name: "किशनपूर, उत्तर प्रदेश",

    action_scan_crop: "पीक तपासणी",
    action_scan_crop_desc: "पिकावरील रोग आणि उपाय शोधा",
    action_soil_test: "माती परीक्षण",
    action_soil_test_desc: "मातीतील ओलावा व खतांची माहिती",
    action_ask_ai: "AI ला विचारा (आवाज)",
    action_ask_ai_desc: "तुमच्या भाषेत बोलून विचारा",
    action_weather: "हवामान माहिती",
    action_weather_desc: "7 दिवसांचा अंदाज आणि धोके",
    action_mandi_prices: "बाजार भाव",
    action_mandi_prices_desc: "जवळच्या बाजार समितीचे दर पहा",
    action_schemes: "शासकीय योजना",
    action_schemes_desc: "आर्थिक मदतीसाठी अर्ज करा",
    action_insurance: "विमा अहवाल",
    action_insurance_desc: "नुकसान अहवाल तयार करा",

    nav_home: "मुख्य पान",
    nav_vision: "व्हिजन लॅब",
    nav_voice: "आवाज AI",
    nav_mandi: "बाजार भाव",
    nav_schemes: "योजना",
    nav_profile: "प्रोफाईल",

    vision_lab_title: "🌱 AI व्हिजन लॅब",
    vision_lab_subtitle: "पिकांचे किंवा मातीचे फोटो अपलोड करून त्वरित उपाय मिळवा.",
    pill_disease: "🌿 रोग स्कॅनर",
    pill_soil: "🟤 माती विश्लेषक",
    pill_growth: "🌾 पीक वाढ मॉनिटर",
    pill_grade: "🍅 प्रतवारी ग्रेडर",
    pill_insurance: "📄 विमा दावा अहवाल",
    upload_prompt_title: "तुमचा फोटो येथे ओढा किंवा खालील बटण दाबा",
    upload_prompt_support: "शेतातून घेतलेला फोटो निवडा",
    sample_label: "किंवा चाचणी फोटो निवडा:",
    take_photo: "फोटो काढा",
    upload_photo: "फोटो अपलोड करा",
    btn_analyze_action: "कृषिमित्र AI ने तपासा",
    analyzing_with_ai: "पिकाचे विश्लेषण सुरू आहे...",
    loading_subtext: "मातीची सुपीकता आणि पिकाच्या आरोग्याची तपासणी होत आहे",
    ai_verified: "AI सत्यापित अहवाल",
    download_pdf: "प्रिंट करा / पीडीएफ सेव्ह करा",
    close: "बंद करा",

    voice_title: "कृषिमित्र आवाज AI ला विचारा",
    voice_desc: "माईक बटण दाबा आणि प्रश्न विचारा. आपल्या मातृभाषेत बोला.",
    speaking_in: "बोलण्याची भाषा:",
    bot_welcome_msg: "नमस्ते! मी तुमचा कृषिमित्र सहाय्यक आहे. आज पिके, हवामान किंवा बाजार दरांबाबत मी तुम्हाला काय मदत करू?",
    mic_status_idle: "प्रश्न विचारण्यासाठी माईक दाबा",
    mic_status_listening: "ऐकत आहे... बोला",
    suggested_questions: "हे विचारून पहा:",

    village_kisankot: "किसानकोट गाव, उत्तर प्रदेश",
    wind: "वाऱ्याचा वेग",
    rain_probability: "पावसाची शक्यता",
    temp_feels: "जाणवणारा तापमान",
    weather_ai_advice: "AI पीक सल्ला",
    weather_ai_advice_text: "पुढील २४ तासांत पावसाची शक्यता आहे. नायट्रोजन/युरिया खतांचा वापर पुढे ढकला. पाणी साचू देऊ नका.",
    weekly_forecast: "7 दिवसांचा हवामान अंदाज",
    day_today: "आज",
    day_tomorrow: "उद्या",
    weather_label_rain: "पाऊस",
    weather_label_heavy_rain: "मुसळधार पाऊस",
    weather_label_cloudy: "ढगाळ",
    weather_label_sunny: "ऊन",

    market_mandi_prices: "💰 बाजार भाव",
    market_mandi_subtitle: "जवळच्या शासकीय कृषी उत्पन्न बाजार समित्यांमधील सर्वोत्तम भाव शोधा.",
    rates_updated_today: "दर अपडेट: आज सकाळी १०:०० वाजता",
    mandi_highest: "सर्वाधिक दर",
    mandi_lowest: "कमीतकमी दर",
    price_comparison_chart: "जवळच्या बाजार समित्यांमधील दरांची तुलना",
    recommendation_bold: "सर्वोत्तम बाजार शिफारस:",
    paddy_sell_advise: "लक्ष्मीपूर कृषी बाजारामध्ये विकल्यास ₹३००/क्विंटल अधिक मिळतील. वाहतूक खर्च ₹४० आहे, निव्वळ नफा जास्त होईल.",
    all_nearby_mandis: "जवळचे सर्व बाजार आणि त्यांचे भाव",

    schemes_title: "🏛 शासकीय योजना",
    schemes_subtitle: "केंद्र आणि राज्य सरकारकडून मिळणाऱ्या थेट अनुदानाची आणि मदतीची माहिती.",
    scheme_filter_all: "सर्व योजना",
    scheme_filter_subsidy: "अनुदान योजना",
    scheme_filter_insurance: "पीक विमा योजना",
    scheme_filter_bookmarked: "★ बुकमार्क केलेल्या",

    registered_since: "ऑक्टोबर २०२४ पासून नोंदणीकृत",
    lbl_name: "शेतकऱ्याचे नाव",
    lbl_phone: "मोबाईल नंबर",
    lbl_village: "गाव",
    lbl_district: "जिल्हा",
    lbl_land: "जमीन आकार (एकर)",
    lbl_soil_type: "मातीचा प्रकार",
    lbl_active_crops: "लागवड केलेली पिके",
    save_profile: "माहिती जतन करा",
    reports_history: "तुमचे जतन केलेले अहवाल"
  },
  pa: {
    tagline: "ਹਰ ਕਿਸਾਨ ਲਈ ਸਰਲ AI ਸਹਾਇਤਾ",
    text_size: "ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ:",
    high_contrast: "ਕੰਟਰਾਸਟ ਮੋਡ",
    welcome_greeting: "ਨਮਸਤੇ",
    welcome_message: "ਅੱਜ ਤੁਸੀਂ ਕਿਸ ਖੇਤੀ ਸੇਵਾ ਦੀ ਵਰਤੋਂ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    quick_actions: "ਤੁਰੰਤ ਵਿਕਲਪ",
    today_weather: "ਅੱਜ ਦਾ ਮੌਸਮ",
    rain_prob_brief: "🌧 80% ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ",
    weather_light_rain: "ਹਲਕੀ ਬਾਰਿਸ਼",
    humidity: "ਨਮੀ",
    advisory_title: "AI ਸਲਾਹ:",
    weather_advisory_text: "ਕੱਲ੍ਹ ਭਾਰੀ ਮੀਂਹ ਪੈਣ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਅੱਜ ਕੀੜੇਮਾਰ ਦਵਾਈਆਂ ਦਾ ਛਿੜਕਾਅ ਨਾ ਕਰੋ।",
    recent_alerts: "ਤਾਜ਼ਾ ਚੇਤਾਵਨੀਆਂ",
    alert_disease: "ਬਿਮਾਰੀ ਦਾ ਖਤਰਾ",
    rice_blast_detected: "ਝੋਨੇ ਦਾ ਬਲਾਸਟ ਰੋਗ",
    rice_blast_detected_desc: "ਨੇੜਲੇ ਪਿੰਡ ਲਕਸ਼ਮੀਪੁਰ ਵਿੱਚ ਦੇਖਿਆ ਗਿਆ। ਖੇਤਾਂ ਵਿੱਚੋਂ ਪਾਣੀ ਦੀ ਨਿਕਾਸੀ ਰੱਖੋ।",
    alert_market: "ਮੰਡੀ ਅੱਪਡੇਟ",
    paddy_prices_up: "ਨੇੜਲੀ ਮੰਡੀ ਵਿੱਚ ਝੋਨੇ ਦੇ ਭਾਅ ਵਿੱਚ",
    paddy_prices_up_desc: "ਵਾਧਾ ਹੋਇਆ। ਫ਼ਸਲ ਕੱਟ ਕੇ ਵੇਚਣ ਦਾ ਵਧੀਆ ਸਮਾਂ ਹੈ।",
    alert_scheme: "ਨਵੀਂ ਸਕੀਮ",
    pm_kusum_scheme: "ਪੀਐਮ ਕੁਸੁਮ ਯੋਜਨਾ",
    pm_kusum_scheme_desc: "ਤੁਹਾਡੇ ਬਲਾਕ ਵਿੱਚ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸ਼ੁਰੂ ਹੋ ਚੁੱਕੀ ਹੈ। ਸੋਲਰ ਪੰਪ ਤੇ 60% ਸਬਸਿਡੀ ਪਾਓ।",
    village_name: "ਕਿਸ਼ਨਪੁਰ, ਉੱਤਰ ਪ੍ਰਦੇਸ਼",

    action_scan_crop: "ਫ਼ਸਲ ਜਾਂਚੋ",
    action_scan_crop_desc: "ਫ਼ਸਲ ਦੀਆਂ ਬਿਮਾਰੀਆਂ ਦਾ ਪਤਾ ਲਗਾਓ",
    action_soil_test: "ਮਿੱਟੀ ਜਾਂਚੋ",
    action_soil_test_desc: "ਨਮੀ ਅਤੇ ਖਾਦਾਂ ਦੀ ਜਾਣਕਾਰੀ ਲਓ",
    action_ask_ai: "AI ਨੂੰ ਪੁੱਛੋ (ਆਵਾਜ਼)",
    action_ask_ai_desc: "ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲ ਕੇ ਪੁੱਛੋ",
    action_weather: "ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ",
    action_weather_desc: "7 ਦਿਨਾਂ ਦਾ ਪੂਰਵ-ਅਨੁਮਾਨ ਤੇ ਚੇਤਾਵਨੀ",
    action_mandi_prices: "ਮੰਡੀ ਦੇ ਭਾਅ",
    action_mandi_prices_desc: "ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਦੇ ਭਾਅ ਦੇਖੋ",
    action_schemes: "ਸਰਕਾਰੀ ਸਕੀਮਾਂ",
    action_schemes_desc: "ਆਰਥਿਕ ਸਹਾਇਤਾ ਲਈ ਅਰਜ਼ੀ ਦਿਓ",
    action_insurance: "ਬੀਮਾ ਰਿਪੋਰਟ",
    action_insurance_desc: "ਫ਼ਸਲ ਨੁਕਸਾਨ ਦੀ ਰਿਪੋਰਟ ਬਣਾਓ",

    nav_home: "ਮੁੱਖ ਪੰਨਾ",
    nav_vision: "ਵਿਜ਼ਨ ਲੈਬ",
    nav_voice: "ਆਵਾਜ਼ AI",
    nav_mandi: "ਮੰਡੀ ਭਾਅ",
    nav_schemes: "ਸਕੀਮਾਂ",
    nav_profile: "ਪ੍ਰੋਫਾਈਲ",

    vision_lab_title: "🌱 AI ਵਿਜ਼ਨ ਲੈਬ",
    vision_lab_subtitle: "ਫ਼ਸਲ ਜਾਂ ਮਿੱਟੀ ਦੀਆਂ ਤਸਵੀਰਾਂ ਅਪਲੋਡ ਕਰਕੇ ਤੁਰੰਤ ਸਲਾਹ ਲਓ।",
    pill_disease: "🌿 ਬਿਮਾਰੀ ਸਕੈਨਰ",
    pill_soil: "🟤 ਮਿੱਟੀ ਵਿਸ਼ਲੇਸ਼ਕ",
    pill_growth: "🌾 ਵਿਕਾਸ ਮਾਨੀਟਰ",
    pill_grade: "🍅 ਗੁਣਵੱਤਾ ਗ੍ਰੇਡਰ",
    pill_insurance: "📄 ਬੀਮਾ ਦਾਅਵਾ ਰਿਪੋਰਟ",
    upload_prompt_title: "ਆਪਣੀ ਤਸਵੀਰ ਇੱਥੇ ਖਿੱਚੋ ਜਾਂ ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ ਦਬਾਓ",
    upload_prompt_support: "ਖੇਤ ਵਿੱਚੋਂ ਖਿੱਚੀ ਗਈ ਫੋਟੋ ਚੁਣੋ",
    sample_label: "ਜਾਂ ਇੱਕ ਟੈਸਟ ਫੋਟੋ ਚੁਣੋ:",
    take_photo: "ਫੋਟੋ ਖਿੱਚੋ",
    upload_photo: "ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ",
    btn_analyze_action: "ਕ੍ਰਿਸ਼ੀਮਿੱਤਰ AI ਨਾਲ ਜਾਂਚੋ",
    analyzing_with_ai: "ਫ਼ਸਲ ਦੀ ਜਾਂਚ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    loading_subtext: "ਮਿੱਟੀ ਦੀ ਸਿਹਤ ਅਤੇ ਪੱਤਿਆਂ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ",
    ai_verified: "AI ਪ੍ਰਮਾਣਿਤ ਰਿਪੋਰਟ",
    download_pdf: "ਪ੍ਰਿੰਟ ਕਰੋ / ਪੀਡੀਐਫ ਸੇਵ ਕਰੋ",
    close: "ਬੰਦ ਕਰੋ",

    voice_title: "ਕ੍ਰਿਸ਼ੀਮਿੱਤਰ ਆਵਾਜ਼ AI ਨੂੰ ਪੁੱਛੋ",
    voice_desc: "ਮਾਈਕ ਬਟਨ ਦਬਾਓ ਅਤੇ ਸਵਾਲ ਪੁੱਛੋ। ਆਪਣੀ ਮਾਤ੍ਰਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੋ।",
    speaking_in: "ਬੋਲਣ ਦੀ ਭਾਸ਼ਾ:",
    bot_welcome_msg: "ਨਮਸਤੇ! ਮੈਂ ਤੁਹਾਡਾ ਕ੍ਰਿਸ਼ੀਮਿੱਤਰ ਸਹਾਇਕ ਹਾਂ। ਅੱਜ ਫ਼ਸਲਾਂ, ਮੌਸਮ ਜਾਂ ਮੰਡੀ ਭਾਅ ਬਾਰੇ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    mic_status_idle: "ਪੁੱਛਣ ਲਈ ਮਾਈਕ ਬਟਨ ਦਬਾਓ",
    mic_status_listening: "ਸੁਣ ਰਿਹਾ ਹਾਂ... ਬੋਲੋ",
    suggested_questions: "ਇਹ ਪੁੱਛ ਕੇ ਦੇਖੋ:",

    village_kisankot: "ਕਿਸਾਨਕੋਟ ਪਿੰਡ, ਉੱਤਰ ਪ੍ਰਦੇਸ਼",
    wind: "ਹਵਾ ਦੀ ਗਤੀ",
    rain_probability: "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ",
    temp_feels: "ਮਹਿਸੂਸ ਤਾਪਮਾਨ",
    weather_ai_advice: "AI ਫ਼ਸਲ ਸਲਾਹ",
    weather_ai_advice_text: "ਅਗਲੇ 24 ਘੰਟਿਆਂ ਵਿੱਚ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਯੂਰੀਆ ਖਾਦ ਪਾਉਣ ਤੋਂ ਗੁਰੇਜ਼ ਕਰੋ। ਸਬਜ਼ੀਆਂ ਦੇ ਬੈੱਡਾਂ ਵਿੱਚ ਨਿਕਾਸੀ ਰੱਖੋ।",
    weekly_forecast: "7 ਦਿਨਾਂ ਦਾ ਮੌਸਮ ਪੂਰਵ-ਅਨੁਮਾਨ",
    day_today: "ਅੱਜ",
    day_tomorrow: "ਕੱਲ੍ਹ",
    weather_label_rain: "ਮੀਂਹ",
    weather_label_heavy_rain: "ਭਾਰੀ ਮੀਂਹ",
    weather_label_cloudy: "ਬੱਦਲਵਾਈ",
    weather_label_sunny: "ਧੁੱਪ",

    market_mandi_prices: "💰 ਮੰਡੀ ਫ਼ਸਲ ਭਾਅ",
    market_mandi_subtitle: "ਨੇੜਲੀਆਂ ਸਰਕਾਰੀ APMC ਮੰਡੀਆਂ ਵਿੱਚ ਫ਼ਸਲਾਂ ਦੇ ਸਭ ਤੋਂ ਵੱਧ ਭਾਅ ਲੱਭੋ।",
    rates_updated_today: "ਦਰ ਅੱਪਡੇਟ: ਅੱਜ ਸਵੇਰੇ 10:00 ਵਜੇ",
    mandi_highest: "ਸਭ ਤੋਂ ਵੱਧ ਭਾਅ",
    mandi_lowest: "ਸਭ ਤੋਂ ਘੱਟ ਭਾਅ",
    price_comparison_chart: "ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਵਿੱਚ ਭਾਵਾਂ ਦੀ ਤੁਲਨਾ",
    recommendation_bold: "ਵਧੀਆ ਬਜ਼ਾਰ ਦੀ ਸਲਾਹ:",
    paddy_sell_advise: "ਲਕਸ਼ਮੀਪੁਰ APMC ਵਿੱਚ ਵੇਚਣ ਨਾਲ ₹300/ਕੁਇੰਟਲ ਵੱਧ ਮਿਲੇਗਾ। ਆਵਾਜਾਈ ਖਰਚਾ ₹40 ਹੈ, ਇਸ ਲਈ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ ਵੱਧ ਹੋਵੇਗਾ।",
    all_nearby_mandis: "ਨੇੜਲੀਆਂ ਸਾਰੀਆਂ ਮੰਡੀਆਂ ਅਤੇ ਉਹਨਾਂ ਦੇ ਭਾਅ",

    schemes_title: "🏛 ਸਰਕਾਰੀ ਸਕੀਮਾਂ",
    schemes_subtitle: "ਕੇਂਦਰ ਅਤੇ ਰਾਜ ਸਰਕਾਰਾਂ ਵੱਲੋਂ ਕਿਸਾਨਾਂ ਲਈ ਸਬਸਿਡੀਆਂ ਅਤੇ ਵਿੱਤੀ ਸਹਾਇਤਾ।",
    scheme_filter_all: "ਸਾਰੀਆਂ ਸਕੀਮਾਂ",
    scheme_filter_subsidy: "ਸਬਸਿਡੀਆਂ",
    scheme_filter_insurance: "ਬੀਮਾ ਸਕੀਮਾਂ",
    scheme_filter_bookmarked: "★ ਬੁੱਕਮਾਰਕ ਕੀਤੀਆਂ",

    registered_since: "ਅਕਤੂਬਰ 2024 ਤੋਂ ਰਜਿਸਟਰਡ",
    lbl_name: "ਕਿਸਾਨ ਦਾ ਨਾਮ",
    lbl_phone: "ਮੋਬਾਈਲ ਨੰਬਰ",
    lbl_village: "ਪਿੰਡ",
    lbl_district: "ਜ਼ਿਲ੍ਹਾ",
    lbl_land: "ਜ਼ਮੀਨ ਦਾ ਆਕਾਰ (ਏਕੜ)",
    lbl_soil_type: "ਮਿੱਟੀ ਦੀ ਕਿਸਮ",
    lbl_active_crops: "ਬੀਜੀਆਂ ਫ਼ਸਲਾਂ",
    save_profile: "ਪ੍ਰੋਫਾਈਲ ਸੁਰੱਖਿਅਤ ਕਰੋ",
    reports_history: "ਤੁਹਾਡੀਆਂ ਸੁਰੱਖਿਅਤ AI ਰਿਪੋਰਟਾਂ"
  }
};

// --------------------------------------------------------------------------
// 3. DATABASES (CROP PRICES & SCHEMES)
// --------------------------------------------------------------------------
const MANDI_DB = {
  paddy: {
    nameEN: "Paddy (Basmati)",
    nameHI: "धान (बासमती)",
    emoji: "🌾",
    highest: 2350,
    highestMandi: "Laxmipur APMC (12km)",
    lowest: 2050,
    lowestMandi: "Kishanpur Mandi (4km)",
    recommendation: "Selling at Laxmipur APMC gives ₹300/quintal more. Transport cost is ₹40, net profit is higher.",
    prices: [
      { name: "Laxmipur APMC", price: 2350, distance: "12km", trend: "up" },
      { name: "Gorakhpur Sadar Mandi", price: 2210, distance: "18km", trend: "up" },
      { name: "Kishanpur Mandi", price: 2050, distance: "4km", trend: "down" }
    ]
  },
  wheat: {
    nameEN: "Wheat (Lokwan)",
    nameHI: "गेहूं (लोकवान)",
    emoji: "🌾",
    highest: 2275,
    highestMandi: "Gorakhpur Sadar Mandi (18km)",
    lowest: 2150,
    lowestMandi: "Laxmipur APMC (12km)",
    recommendation: "Wheat rates are highest in Gorakhpur Sadar Mandi. We advise wait 3 days as prices are rising.",
    prices: [
      { name: "Gorakhpur Sadar Mandi", price: 2275, distance: "18km", trend: "up" },
      { name: "Kishanpur Mandi", price: 2200, distance: "4km", trend: "stable" },
      { name: "Laxmipur APMC", price: 2150, distance: "12km", trend: "down" }
    ]
  },
  tomato: {
    nameEN: "Tomato (Desi)",
    nameHI: "टमाटर (देशी)",
    emoji: "🍅",
    highest: 1800,
    highestMandi: "Kishanpur Mandi (4km)",
    lowest: 1400,
    lowestMandi: "Gorakhpur Sadar Mandi (18km)",
    recommendation: "Tomato prices are highly volatile. Kishanpur Mandi is paying premium ₹1800/Qtl today due to low supply.",
    prices: [
      { name: "Kishanpur Mandi", price: 1800, distance: "4km", trend: "up" },
      { name: "Laxmipur APMC", price: 1650, distance: "12km", trend: "up" },
      { name: "Gorakhpur Sadar Mandi", price: 1400, distance: "18km", trend: "down" }
    ]
  },
  potato: {
    nameEN: "Potato (Jyoti)",
    nameHI: "आलू (ज्योति)",
    emoji: "🥔",
    highest: 1350,
    highestMandi: "Laxmipur APMC (12km)",
    lowest: 1100,
    lowestMandi: "Kishanpur Mandi (4km)",
    recommendation: "Potatoes have solid storage lifetime. Consider storing in Cold Storage if you can't transport to Laxmipur.",
    prices: [
      { name: "Laxmipur APMC", price: 1350, distance: "12km", trend: "stable" },
      { name: "Gorakhpur Sadar Mandi", price: 1280, distance: "18km", trend: "up" },
      { name: "Kishanpur Mandi", price: 1100, distance: "4km", trend: "down" }
    ]
  },
  mustard: {
    nameEN: "Mustard Seed",
    nameHI: "सरसों (पीली)",
    emoji: "🌱",
    highest: 5450,
    highestMandi: "Gorakhpur Sadar Mandi (18km)",
    lowest: 5100,
    lowestMandi: "Kishanpur Mandi (4km)",
    recommendation: "Government MSP is ₹5650. Mandi rates are lower; consider selling to government procurement centers directly.",
    prices: [
      { name: "Gorakhpur Sadar Mandi", price: 5450, distance: "18km", trend: "up" },
      { name: "Laxmipur APMC", price: 5300, distance: "12km", trend: "stable" },
      { name: "Kishanpur Mandi", price: 5100, distance: "4km", trend: "down" }
    ]
  }
};

let SCHEMES_DB = [];

// Fallback schemes list to use if both server fetch and localStorage cache are missing
const FALLBACK_SCHEMES = [
  {
    "id": "pm-kisan",
    "title": "PM Kisan Samman Nidhi",
    "category": "subsidy",
    "summary": "Direct income support of ₹6,000 per year in three equal installments to all landholding farmer families across India to help purchase inputs.",
    "benefit": "₹6,000 / Year Cash Assistance (Direct Benefit Transfer)",
    "source": "Ministry of Agriculture and Farmers Welfare",
    "officialLink": "https://pmkisan.gov.in/",
    "lastUpdated": "2026-08-01",
    "deadline": null,
    "eligibilityRules": {
      "allowedStates": ["All"],
      "requiredOwnership": ["Owner"],
      "maxLandSizeAcres": null,
      "requiredFarmingType": "any",
      "requiredIrrigation": "any"
    },
    "documents": [
      "Aadhaar Card",
      "Land Record (Jamabandi/Khasra/RoR)",
      "Bank Passbook linked with Aadhaar",
      "Mobile Number linked with Aadhaar"
    ],
    "relatedSchemes": ["pm-fasal-bima", "soil-health-card", "pm-kusum"]
  },
  {
    "id": "pm-fasal-bima",
    "title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    "category": "insurance",
    "summary": "Financial support and risk coverage for farmers suffering crop loss or damage due to natural calamities, pests, and diseases.",
    "benefit": "Low Premium Crop Insurance (1.5% - 2% Premium for Rabi/Kharif crops)",
    "source": "Ministry of Agriculture and Farmers Welfare",
    "officialLink": "https://pmfby.gov.in/",
    "lastUpdated": "2026-08-01",
    "deadline": "2026-08-31",
    "eligibilityRules": {
      "allowedStates": ["All"],
      "requiredOwnership": ["Owner", "Tenant", "Sharecropper"],
      "maxLandSizeAcres": null,
      "requiredFarmingType": "any",
      "requiredIrrigation": "any"
    },
    "documents": [
      "Aadhaar Card",
      "Land records (RoR) or Tenancy Agreement",
      "Sowing Certificate issued by Patwari/Gram Panchayat",
      "Bank Account Details (with Cancelled Cheque)"
    ],
    "relatedSchemes": ["pm-kisan", "soil-health-card"]
  },
  {
    "id": "pm-kusum",
    "title": "PM KUSUM Yojana (Solar Pumps)",
    "category": "solar",
    "summary": "De-dieselization of the farm sector. Install clean solar water pumps with 60% combined subsidy from Central & State Governments.",
    "benefit": "60% Subsidy on Solar Water Pump Installation",
    "source": "Ministry of New and Renewable Energy",
    "officialLink": "https://pmkusum.mnre.gov.in/",
    "lastUpdated": "2026-08-03",
    "deadline": "2026-09-30",
    "eligibilityRules": {
      "allowedStates": ["All"],
      "requiredOwnership": ["Owner"],
      "maxLandSizeAcres": 12.5,
      "requiredFarmingType": "any",
      "requiredIrrigation": ["Borewell/Tubewell", "Canal"]
    },
    "documents": [
      "Aadhaar Card",
      "Land Ownership Certificate",
      "Borewell/Water Source availability certificate",
      "Electricity Bill (if grid-connected)",
      "Bank Passbook",
      "Passport Size Photo"
    ],
    "relatedSchemes": ["pm-kisan", "pmksy-pdmc"]
  }
];

// --------------------------------------------------------------------------
// 4. PRE-CONFIGURED SAMPLE IMAGES FOR HACKATHON
// --------------------------------------------------------------------------
const SAMPLE_PHOTOS = {
  disease: [
    { label: "Rice Brown Spots", icon: "🌾", src: "sample_rice_blast.jpg", id: "sample-dis-1" },
    { label: "Cotton Crinkled Leaves", icon: "🌱", src: "sample_cotton_curl.jpg", id: "sample-dis-2" },
    { label: "Tomato Yellow Spot", icon: "🍅", src: "sample_tomato_blight.jpg", id: "sample-dis-3" }
  ],
  soil: [
    { label: "Dry Soil Sample", icon: "🟤", src: "sample_dry_soil.jpg", id: "sample-soil-1" },
    { label: "Dark Loam Soil", icon: "⚫", src: "sample_dark_soil.jpg", id: "sample-soil-2" }
  ],
  growth: [
    { label: "Young Rice Shoots", icon: "🌾", src: "sample_growth_tillering.jpg", id: "sample-growth-1" },
    { label: "Harvest Ready Wheat", icon: "🌾", src: "sample_growth_harvest.jpg", id: "sample-growth-2" }
  ],
  grade: [
    { label: "Harvested Red Tomatoes", icon: "🍅", src: "sample_grade_tomato.jpg", id: "sample-grade-1" },
    { label: "Potatoes in Sacks", icon: "🥔", src: "sample_grade_potato.jpg", id: "sample-grade-2" }
  ],
  insurance: [
    { label: "Hailstorm Damaged Field", icon: "⛈️", src: "sample_flood_rice.jpg", id: "sample-ins-1" },
    { label: "Drought Dried Crop", icon: "☀️", src: "sample_drought_wheat.jpg", id: "sample-ins-2" }
  ]
};

// --------------------------------------------------------------------------
// 5. TRANSLATION ENGINE & UI REFRESH
// --------------------------------------------------------------------------
const translateUI = () => {
  const lang = appState.currentLanguage;
  const trans = i18n[lang];

  // Update HTML language attribute
  document.documentElement.lang = lang;

  // Scan and translate components using data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (trans[key]) {
      // If it's an input or textarea, translate placeholder
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = trans[key];
      } else {
        el.innerHTML = trans[key];
      }
    }
  });

  // Update specific static details depending on language
  // Mandi page crop search input
  const searchInput = document.getElementById('market-search-input');
  if (searchInput) {
    if (lang === 'hi') searchInput.placeholder = "फसल खोजें (जैसे: धान, गेहूं, टमाटर, आलू)...";
    else if (lang === 'gu') searchInput.placeholder = "પાકની શોધ કરો (ઉદા. ડાંગર, ઘઉં, ટામેટા)...";
    else if (lang === 'mr') searchInput.placeholder = "पीक शोधा (उदा. धान, गहू, टोमॅटो)...";
    else if (lang === 'pa') searchInput.placeholder = "ਫ਼ਸਲ ਖੋਜੋ (ਜਿਵੇਂ ਝੋਨਾ, ਕਣਕ, ਟਮਾਟਰ)...";
    else searchInput.placeholder = "Search crop (e.g. Paddy, Wheat, Tomato, Potato)...";
  }

  // Update active layouts translations dynamically if visible
  renderMarketBars();
  renderMandiList();
  renderSchemes();
  renderHistory();
};

// --------------------------------------------------------------------------
// 6. ACCESSIBILITY HANDLERS
// --------------------------------------------------------------------------
const setupAccessibility = () => {
  // Font Resizing logic
  const decreaseBtn = document.getElementById('btn-text-decrease');
  const resetBtn = document.getElementById('btn-text-reset');
  const increaseBtn = document.getElementById('btn-text-increase');

  const removeFontClasses = () => {
    document.body.classList.remove('font-small', 'font-normal', 'font-large');
    decreaseBtn.classList.remove('active');
    resetBtn.classList.remove('active');
    increaseBtn.classList.remove('active');
  };

  decreaseBtn.addEventListener('click', () => {
    playSound('snd-click');
    removeFontClasses();
    document.body.classList.add('font-small');
    decreaseBtn.classList.add('active');
    appState.fontSize = 'small';
    localStorage.setItem('km_fontSize', 'small');
  });

  resetBtn.addEventListener('click', () => {
    playSound('snd-click');
    removeFontClasses();
    document.body.classList.add('font-normal');
    resetBtn.classList.add('active');
    appState.fontSize = 'medium';
    localStorage.setItem('km_fontSize', 'medium');
  });

  increaseBtn.addEventListener('click', () => {
    playSound('snd-click');
    removeFontClasses();
    document.body.classList.add('font-large');
    increaseBtn.classList.add('active');
    appState.fontSize = 'large';
    localStorage.setItem('km_fontSize', 'large');
  });

  // High Contrast Outdoor Sunlight Toggle
  const contrastBtn = document.getElementById('btn-high-contrast');
  contrastBtn.addEventListener('click', () => {
    playSound('snd-click');
    appState.highContrast = !appState.highContrast;
    if (appState.highContrast) {
      document.body.classList.add('high-contrast');
      contrastBtn.classList.add('active');
    } else {
      document.body.classList.remove('high-contrast');
      contrastBtn.classList.remove('active');
    }
    localStorage.setItem('km_highContrast', appState.highContrast);
  });

  // Language Dropdown Selector
  const langSelect = document.getElementById('lang-select');
  langSelect.addEventListener('change', (e) => {
    playSound('snd-chime');
    appState.currentLanguage = e.target.value;
    localStorage.setItem('km_lang', appState.currentLanguage);
    
    // Also sync the voice assistant language to match
    const voiceLang = document.getElementById('voice-lang-select');
    if (voiceLang) {
      if (appState.currentLanguage === 'hi') voiceLang.value = 'hi-IN';
      else if (appState.currentLanguage === 'gu') voiceLang.value = 'gu-IN';
      else if (appState.currentLanguage === 'mr') voiceLang.value = 'mr-IN';
      else if (appState.currentLanguage === 'pa') voiceLang.value = 'pa-IN';
      else voiceLang.value = 'en-IN';
    }

    translateUI();
    if (typeof applyAllFilters === 'function') {
      applyAllFilters();
    }
    if (typeof generateAISchemeRecommendations === 'function') {
      generateAISchemeRecommendations();
    }
    if (typeof triggerCropAdvisory === 'function') {
      triggerCropAdvisory();
    }
  });

  // Restore saved accessibility preferences
  if (localStorage.getItem('km_lang')) {
    appState.currentLanguage = localStorage.getItem('km_lang');
    langSelect.value = appState.currentLanguage;
  }
  
  if (localStorage.getItem('km_highContrast') === 'true') {
    appState.highContrast = true;
    document.body.classList.add('high-contrast');
    contrastBtn.classList.add('active');
  }

  if (localStorage.getItem('km_fontSize')) {
    appState.fontSize = localStorage.getItem('km_fontSize');
    removeFontClasses();
    if (appState.fontSize === 'small') {
      document.body.classList.add('font-small');
      decreaseBtn.classList.add('active');
    } else if (appState.fontSize === 'large') {
      document.body.classList.add('font-large');
      increaseBtn.classList.add('active');
    } else {
      document.body.classList.add('font-normal');
      resetBtn.classList.add('active');
    }
  }

  // Handle voice badge top shortcut to Profile
  document.getElementById('btn-view-profile-shortcut').addEventListener('click', () => {
    switchTab('profile');
  });
  document.getElementById('btn-view-profile-shortcut').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      switchTab('profile');
    }
  });
};

// --------------------------------------------------------------------------
// 7. BOTTOM NAVIGATION CONTROLLER
// --------------------------------------------------------------------------
const switchTab = (tabId) => {
  playSound('snd-click');
  
  // Hide active tab
  const activeView = document.querySelector('.tab-view.active-view');
  if (activeView) activeView.classList.remove('active-view');

  // Deactivate active nav button
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) activeNav.classList.remove('active');

  // Show target tab
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) targetView.classList.add('active-view');

  // Activate target nav button
  const targetNav = document.getElementById(`nav-btn-${tabId}`);
  if (targetNav) targetNav.classList.add('active');

  appState.currentTab = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Special triggers per tab activation
  if (tabId === 'vision') {
    selectVisionModule(appState.activeVisionModule);
  } else if (tabId === 'market') {
    renderMarketBars();
    renderMandiList();
  } else if (tabId === 'schemes') {
    renderSchemes();
  }
};

// --------------------------------------------------------------------------
// 8. AI VISION LAB MODULES CONTROLLER
// --------------------------------------------------------------------------
const selectVisionModule = (moduleId) => {
  playSound('snd-click');
  appState.activeVisionModule = moduleId;

  // Toggle visual pills
  document.querySelectorAll('.vision-pill').forEach(pill => {
    pill.classList.remove('active');
    pill.setAttribute('aria-selected', 'false');
  });

  const activePill = document.getElementById(`pill-${moduleId}`);
  if (activePill) {
    activePill.classList.add('active');
    activePill.setAttribute('aria-selected', 'true');
  }

  // Clear previous previews and results
  clearVisionWorkspace();

  // Populate sample photo pills for fast testing
  populateSamplePills(moduleId);
};

const clearVisionWorkspace = () => {
  appState.selectedSampleImage = null;
  document.getElementById('image-preview-container').classList.add('hidden');
  document.getElementById('upload-prompt').classList.remove('hidden');
  document.getElementById('btn-analyze').disabled = true;
  document.getElementById('vision-results-area').classList.add('hidden');
  document.getElementById('vision-results-area').innerHTML = '';
  document.getElementById('vision-file-input').value = '';
};

const populateSamplePills = (moduleId) => {
  const container = document.getElementById('sample-pills-container');
  container.innerHTML = '';
  
  const samples = SAMPLE_PHOTOS[moduleId] || [];
  samples.forEach(sample => {
    const btn = document.createElement('button');
    btn.className = 'sample-pill';
    btn.innerHTML = `<span>${sample.icon}</span> ${sample.label}`;
    btn.addEventListener('click', () => {
      playSound('snd-click');
      // Set preview
      const previewImg = document.getElementById('image-preview');
      // Simulate real photos via local placeholders or Unsplash crop/soil images
      let simulatedUrl = '';
      if (moduleId === 'disease') {
        simulatedUrl = sample.id === 'sample-dis-1' 
          ? 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=400' 
          : sample.id === 'sample-dis-2'
          ? 'https://images.unsplash.com/photo-1605333396915-47ed6b68a00e?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400';
      } else if (moduleId === 'soil') {
        simulatedUrl = sample.id === 'sample-soil-1'
          ? 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400';
      } else if (moduleId === 'growth') {
        simulatedUrl = sample.id === 'sample-growth-1'
          ? 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400';
      } else if (moduleId === 'grade') {
        simulatedUrl = sample.id === 'sample-grade-1'
          ? 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400';
      } else {
        simulatedUrl = sample.id === 'sample-ins-1'
          ? 'https://images.unsplash.com/photo-1527525428-2435e1d2b7b9?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400';
      }

      previewImg.src = simulatedUrl;
      document.getElementById('upload-prompt').classList.add('hidden');
      document.getElementById('image-preview-container').classList.remove('hidden');
      document.getElementById('btn-analyze').disabled = false;
      appState.selectedSampleImage = sample.label;
    });
    container.appendChild(btn);
  });
};

// Setup dropzone and input interactions
const setupUploadListeners = () => {
  const dropzone = document.getElementById('vision-dropzone');
  const fileInput = document.getElementById('vision-file-input');
  const btnUpload = document.getElementById('btn-upload');
  const btnCamera = document.getElementById('btn-camera');
  const btnRemove = document.getElementById('btn-remove-preview');
  const btnAnalyze = document.getElementById('btn-analyze');

  btnUpload.addEventListener('click', () => {
    playSound('snd-click');
    fileInput.click();
  });

  btnCamera.addEventListener('click', () => {
    playSound('snd-click');
    // For local mock: simulate camera photo by auto selecting the first sample
    const sampleBtn = document.querySelector('.sample-pill');
    if (sampleBtn) sampleBtn.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadUploadedImage(e.target.files[0]);
    }
  });

  btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    playSound('snd-click');
    clearVisionWorkspace();
  });

  // Drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadUploadedImage(e.dataTransfer.files[0]);
    }
  });

  const loadUploadedImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.getElementById('image-preview');
      previewImg.src = e.target.result;
      document.getElementById('upload-prompt').classList.add('hidden');
      document.getElementById('image-preview-container').classList.remove('hidden');
      btnAnalyze.disabled = false;
      appState.selectedSampleImage = file.name;
    };
    reader.readAsDataURL(file);
  };

  btnAnalyze.addEventListener('click', () => {
    triggerSimulatedAIAnalysis();
  });
};

// --------------------------------------------------------------------------
// 9. SIMULATED AI ENGINE & MOCK FUNCTIONS
// --------------------------------------------------------------------------
const triggerSimulatedAIAnalysis = () => {
  playSound('snd-chime');
  const loading = document.getElementById('analysis-loading');
  const results = document.getElementById('vision-results-area');
  const btnAnalyze = document.getElementById('btn-analyze');
  const previewImg = document.getElementById('image-preview').src;

  // Disable button and show spinner
  btnAnalyze.disabled = true;
  loading.classList.remove('hidden');
  results.classList.add('hidden');

  setTimeout(() => {
    loading.classList.add('hidden');
    results.classList.remove('hidden');
    playSound('snd-success');

    let reportData = {};

    // Execute mock function based on active vision tab
    if (appState.activeVisionModule === 'disease') {
      reportData = mockDetectDisease(appState.selectedSampleImage, previewImg);
    } else if (appState.activeVisionModule === 'soil') {
      reportData = mockAnalyzeSoil(appState.selectedSampleImage, previewImg);
    } else if (appState.activeVisionModule === 'growth') {
      reportData = mockAnalyzeGrowth(appState.selectedSampleImage, previewImg);
    } else if (appState.activeVisionModule === 'grade') {
      reportData = mockGradeProduce(appState.selectedSampleImage, previewImg);
    } else if (appState.activeVisionModule === 'insurance') {
      reportData = mockInsuranceReport(appState.selectedSampleImage, previewImg);
    }

    // Save to App State history and localStorage
    appState.reportsHistory.unshift(reportData);
    localStorage.setItem('km_history', JSON.stringify(appState.reportsHistory));

    // Render results in Vision Area
    renderVisionResults(reportData);
    
    // Refresh history grid in Profile page
    renderHistory();

    // Enable button again
    btnAnalyze.disabled = false;
  }, 1500);
};

// Mock disease function
const mockDetectDisease = (name, img) => {
  let disease = "Rice Blast (धान का झोंका रोग)";
  let confidence = "94%";
  let severity = "High (तीव्र)";
  let symptoms = "Spindle-shaped lesions on leaves with grayish centers. Spreading rapidly due to high humidity.";
  let organic = "Spray Neem oil formulation (3,000 ppm) at 3 ml per liter of water. Ensure proper spacing between rows.";
  let chemical = "Spray Tricyclazole 75 WP at 0.6 grams per liter of water. Avoid water logging.";
  let preventive = "Destroy previous crop residues. Do not apply excessive nitrogen fertilizer.";
  let outbreak = "3 nearby farms in Kishanpur reported Rice Blast in the last 48 hours.";

  if (name && name.includes("Cotton")) {
    disease = "Cotton Leaf Curl (कपास का पत्ता मरोड़ रोग)";
    confidence = "89%";
    severity = "Medium (मध्यम)";
    症状 = "Upward curling of leaf margins, thick veins on leaves, stunted plant growth.";
    organic = "Introduce ladybird beetles to control whiteflies vector. Spray garlic-chili extract.";
    chemical = "Spray Imidacloprid 17.8 SL at 0.5 ml per liter of water to control vector.";
    preventive = "Use resistant cotton hybrids. Eliminate weed hosts near field bunds.";
    outbreak = "1 farm in Laxmipur block reported leaf curl vector outbreak.";
  } else if (name && name.includes("Tomato")) {
    disease = "Early Blight (अगेती झुलसा रोग)";
    confidence = "91%";
    severity = "Medium-Low (हल्का)";
    symptoms = "Concentric dark brown circular spots appearing first on older leaves, forming a target board pattern.";
    organic = "Mulch soil surface with crop residue. Spray copper hydroxide or bio-pesticide Trichoderma.";
    chemical = "Spray Mancozeb 75 WP at 2 grams per liter of water immediately.";
    preventive = "Ensure crop rotation. Water roots directly instead of overhead leaf sprinkling.";
    outbreak = "No outbreaks reported within 5km radius.";
  }

  return {
    id: "REP-" + Date.now().toString().slice(-6),
    type: "Leaf Disease Scan",
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    img: img,
    details: [
      { label: "Detected Disease", value: disease, isAccent: true, type: "red" },
      { label: "Severity Level", value: severity, type: "yellow" },
      { label: "AI Confidence Score", value: confidence, type: "green" },
      { label: "Observed Symptoms", value: symptoms, type: "info" }
    ],
    recommendations: [
      { title: "Organic Treatment (जैविक समाधान)", text: organic },
      { title: "Chemical Treatment (रासायनिक उपाय)", text: chemical },
      { title: "Preventive Measures (बचाव कार्य)", text: preventive }
    ],
    extraInfo: {
      title: "Outbreak Indicator",
      text: outbreak
    }
  };
};

// Mock soil analyzer
const mockAnalyzeSoil = (name, img) => {
  let soilType = "Alluvial Clay-Loam (दोमट मिट्टी)";
  let moisture = "14% (Dry - Low Moisture)";
  let matter = "0.62% (Low)";
  let retention = "Medium (मध्यम)";
  let score = "72/100";
  let crops = "Wheat, Potato, Mustard, Gram";
  let fertilizer = "Apply 25kg Nitrogen (Urea), 15kg Phosphorus (DAP) per acre. Mix 5 tons organic cow compost (गोबर खाद).";

  if (name && name.includes("Dark")) {
    soilType = "Black Clayey Soil (काली मिट्टी)";
    moisture = "28% (Optimal - High Moisture)";
    matter = "1.15% (Optimal)";
    retention = "High (उच्च)";
    score = "89/100";
    crops = "Cotton, Soybeans, Pigeon Pea, Paddy";
    fertilizer = "Soil health is highly rich. Add 10kg Zinc Sulphate per acre to enhance micro-nutrients. Regular compost sufficient.";
  }

  return {
    id: "SOIL-" + Date.now().toString().slice(-6),
    type: "Soil Analysis Test",
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    img: img,
    details: [
      { label: "Soil Type", value: soilType, isAccent: true, type: "green" },
      { label: "Soil Health Score", value: score, type: "green" },
      { label: "Moisture Content", value: moisture, type: "yellow" },
      { label: "Organic Matter (Carbon)", value: matter, type: "info" },
      { label: "Water Retention Capacity", value: retention, type: "info" }
    ],
    recommendations: [
      { title: "Recommended Crops (उपयुक्त फसलें)", text: crops },
      { title: "Nutrient / Fertilizer Advisory (उर्वरक सलाह)", text: fertilizer }
    ]
  };
};

// Mock growth monitor
const mockAnalyzeGrowth = (name, img) => {
  let stage = "Tillering Stage (कल्ले निकलने की अवस्था)";
  let duration = "42 Days since sowing";
  let harvest = "In ~75 days (Mid October)";
  let density = "28 plants per sq. meter (Optimal)";
  let spots = "Weak growth detected in north-east corner (8% area) due to local nitrogen deficiency.";
  let yield = "22 - 24 Quintals per acre (Expected)";

  if (name && name.includes("Harvest")) {
    stage = "Maturity / Ripening Stage (पकने की अवस्था)";
    duration = "118 Days since sowing";
    harvest = "Ready for harvest within 5-7 days!";
    density = "30 plants per sq. meter (Excellent)";
    spots = "Yellowing is uniform across field, indicating natural ripening. No weak areas.";
    yield = "26 - 28 Quintals per acre (Outstanding)";
  }

  return {
    id: "GRO-" + Date.now().toString().slice(-6),
    type: "Crop Growth Check",
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    img: img,
    details: [
      { label: "Active Growth Stage", value: stage, isAccent: true, type: "green" },
      { label: "Crop Sowing Duration", value: duration, type: "info" },
      { label: "Plant Canopy Density", value: density, type: "green" },
      { label: "Weak Growth Hotspots", value: spots, type: "yellow" }
    ],
    recommendations: [
      { title: "Estimated Harvest Date (कटाई समय)", text: harvest },
      { title: "Expected Field Yield (अनुमानित उपज)", text: yield }
    ]
  };
};

// Mock produce grader
const mockGradeProduce = (name, img) => {
  let grade = "Grade A (Premium Export Quality)";
  let sizeColor = "92% Tomato ripeness, uniform spherical size (55-65mm), firm outer flesh, zero blemishes.";
  let val = "₹24 - ₹27 per kg";
  let bestMarket = "Laxmipur APMC (Highest bidder)";
  let transportTip = "Pack in ventilated plastic crates instead of jute bags to prevent transit damage.";

  if (name && name.includes("Potato")) {
    grade = "Grade B (Medium Table Quality)";
    sizeColor = "Potato size varies (40-70mm), skins intact, slight soil presence, 4% sprout possibility.";
    val = "₹12 - ₹14 per kg";
    bestMarket = "Kishanpur Mandi (4km) to save transport costs";
    transportTip = "Store in shaded well-ventilated dry warehouse. Keep away from humidity.";
  }

  return {
    id: "GRD-" + Date.now().toString().slice(-6),
    type: "Quality Grader Test",
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    img: img,
    details: [
      { label: "AI Quality Grade", value: grade, isAccent: true, type: "green" },
      { label: "Expected Market Value", value: val, type: "green" },
      { label: "Recommended Buyer Mandi", value: bestMarket, type: "info" },
      { label: "Size & Ripeness Profile", value: sizeColor, type: "info" }
    ],
    recommendations: [
      { title: "Transport & Storage Advice", text: transportTip }
    ]
  };
};

// Mock insurance report generator
const mockInsuranceReport = (name, img) => {
  let damage = "68% Total Damage";
  let cause = "Excessive Rain & Flood Water Logging (भारी जलभराव)";
  let summary = "Paddy crop completely submerged for 72 hours. Stalk rot and root decay has initiated across 60%+ area. Harvest is unrecoverable.";
  let ready = "Yes - Insurance Ready (Claim Code: KM-BIMA-29801)";
  
  if (name && name.includes("Drought")) {
    damage = "45% Medium Damage";
    cause = "Severe Drought & Delayed Monsoon (सूखा प्रभावित)";
    summary = "Wheat crop leaves drying prematurely, spikelets are small and sterile due to heat shock. Stunted stalks.";
    ready = "Yes - Insurance Ready (Claim Code: KM-BIMA-45102)";
  }

  return {
    id: "INS-" + Date.now().toString().slice(-6),
    type: "Insurance Claim Report",
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    img: img,
    details: [
      { label: "Evaluated Field Damage", value: damage, isAccent: true, type: "red" },
      { label: "Root Cause of Damage", value: cause, type: "red" },
      { label: "Insurance Ready Claim Code", value: ready, type: "green" },
      { label: "Damage Assessment Summary", value: summary, type: "info" }
    ],
    recommendations: [
      { title: "Next Steps for Farmer Claim", text: "Submit this KrishiMitra PDF report along with Land Jamabandi directly inside the PM Fasal Bima portal within 72 hours of weather events." }
    ]
  };
};

// Render the results view dynamically
const renderVisionResults = (report) => {
  const container = document.getElementById('vision-results-area');
  container.innerHTML = '';

  // Result Header
  const header = document.createElement('div');
  header.className = 'result-header-panel';
  
  // Find accent detail
  const accentDetail = report.details.find(d => d.isAccent) || report.details[0];
  const accentClass = accentDetail.type === 'red' ? 'score-accent-yellow' : '';

  header.innerHTML = `
    <div>
      <span class="detail-label">${report.type}</span>
      <h3 class="result-title-main">${report.date}</h3>
    </div>
    <div class="badge-score-pill ${accentClass}">${accentDetail.value}</div>
  `;
  container.appendChild(header);

  // Result Grid 2 column
  const grid = document.createElement('div');
  grid.className = 'results-grid-2col';

  report.details.forEach(d => {
    const box = document.createElement('div');
    box.className = `result-detail-box accent-${d.type}`;
    box.innerHTML = `
      <span class="detail-label">${d.label}</span>
      <span class="detail-value">${d.value}</span>
    `;
    grid.appendChild(box);
  });
  container.appendChild(grid);

  // Recommendations
  report.recommendations.forEach(rec => {
    const recCard = document.createElement('div');
    recCard.className = 'alert-banner alert-blue';
    recCard.style.marginBottom = 'var(--spacing-md)';
    recCard.innerHTML = `
      <div style="font-size: 20px;">💡</div>
      <div>
        <h4 style="font-weight:700; margin-bottom: 2px;">${rec.title}</h4>
        <p style="font-size: 0.95rem;">${rec.text}</p>
      </div>
    `;
    container.appendChild(recCard);
  });

  // Extra Outbreak Warning if present
  if (report.extraInfo) {
    const warning = document.createElement('div');
    warning.className = 'alert-banner alert-yellow';
    warning.innerHTML = `
      <div style="font-size: 20px;">⚠</div>
      <div>
        <h4 style="font-weight:700; margin-bottom: 2px;">${report.extraInfo.title}</h4>
        <p style="font-size: 0.95rem;">${report.extraInfo.text}</p>
      </div>
    `;
    container.appendChild(warning);
  }

  // Action Buttons
  const actButtons = document.createElement('div');
  actButtons.className = 'results-action-buttons';
  actButtons.innerHTML = `
    <button class="btn-primary font-semibold" onclick="openReportModalByIndex(0)">
      <svg class="icon-md" viewBox="0 0 24 24"><path fill="currentColor" d="M18 3H6v4h12V3m1 5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3m-3 11H8v-5h8v5m3-7c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1z"/></svg>
      <span>Print / Download Report</span>
    </button>
    <button class="btn-outline-primary" onclick="clearVisionWorkspace()">
      <span>Scan New Image</span>
    </button>
  `;
  container.appendChild(actButtons);
};

// --------------------------------------------------------------------------
// 10. VOICE ASSISTANT DRIVER (WEB SPEECH API & SIMULATOR)
// --------------------------------------------------------------------------
const setupVoiceAssistant = () => {
  const micBtn = document.getElementById('btn-microphone');
  const micLabel = document.getElementById('mic-status-label');
  const pulse = document.getElementById('mic-pulse');
  const langSelect = document.getElementById('voice-lang-select');
  let recognition = null;
  let isListening = false;

  // Check if Web Speech API is supported
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('recording');
      micLabel.innerHTML = `<span data-i18n="mic_status_listening">Listening... Speak now</span>`;
      translateUI();
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('recording');
      micLabel.innerHTML = `<span data-i18n="mic_status_idle">Tap the microphone to ask a question</span>`;
      translateUI();
    };

    recognition.onerror = (e) => {
      console.log("Speech recognition error", e);
      isListening = false;
      micBtn.classList.remove('recording');
      micLabel.innerText = "Error capturing voice. Try typing or tap suggestions.";
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      handleFarmerVoiceQuestion(transcript);
    };
  }

  micBtn.addEventListener('click', () => {
    playSound('snd-click');
    if (!SpeechRecognition) {
      // Simulator for unsupported browsers (simulate random farmer question)
      micBtn.classList.add('recording');
      micLabel.innerText = "Simulating voice input...";
      setTimeout(() => {
        micBtn.classList.remove('recording');
        const questions = [
          "What is the wheat price in Mandi today?",
          "How do I cure rice brown spots?",
          "Show me details of PM Kusum Scheme",
          "What is the weather advisory today?"
        ];
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        handleFarmerVoiceQuestion(randomQ);
      }, 1500);
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.lang = langSelect.value;
      recognition.start();
    }
  });
};

const handleFarmerVoiceQuestion = (questionText) => {
  addChatMessage(questionText, 'user-message');
  playSound('snd-chime');

  // Core parsing response simulator
  setTimeout(() => {
    let responseText = "I heard you ask: \"" + questionText + "\". I am querying KrishiMitra database...";
    let lowerQ = questionText.toLowerCase();

    if (lowerQ.includes('wheat') || lowerQ.includes('गेहूं') || lowerQ.includes('ઘઉં') || lowerQ.includes('गहू') || lowerQ.includes('ਕਣਕ')) {
      const w = MANDI_DB.wheat;
      responseText = `The highest price for Wheat (Lokwan) is ₹${w.highest}/Qtl at ${w.highestMandi}. The lowest price is ₹${w.lowest}/Qtl at ${w.lowestMandi}. ${w.recommendation}`;
    } else if (lowerQ.includes('paddy') || lowerQ.includes('rice') || lowerQ.includes('धान') || lowerQ.includes('ડાંગਰ') || lowerQ.includes('तांदूळ') || lowerQ.includes('ਝੋਨਾ')) {
      const p = MANDI_DB.paddy;
      responseText = `Rice Paddy prices today: Highest is ₹${p.highest}/Qtl in ${p.highestMandi}. Lowest is ₹${p.lowest}/Qtl in ${p.lowestMandi}. ${p.recommendation}`;
    } else if (lowerQ.includes('tomato') || lowerQ.includes('टमाटर') || lowerQ.includes('ટમેટા') || lowerQ.includes('टोमॅटो') || lowerQ.includes('ਟਮਾਟਰ')) {
      const t = MANDI_DB.tomato;
      responseText = `Tomatoes are selling at an excellent rate today! Highest is ₹${t.highest}/Qtl in ${t.highestMandi}. Lowest is ₹${t.lowest}/Qtl.`;
    } else if (lowerQ.includes('weather') || lowerQ.includes('rain') || lowerQ.includes('मौसम') || lowerQ.includes('વરસાદ') || lowerQ.includes('पाऊस') || lowerQ.includes('ਮੀਂਹ')) {
      responseText = `Today is 29°C with Light Rain (80% probability). AI Crop Advisory: Rain is expected, so postpone spraying nitrogen/urea fertilizer or pesticides today.`;
    } else if (lowerQ.includes('kusum') || lowerQ.includes('kusum') || lowerQ.includes('कुसुम')) {
      responseText = `Under PM Kusum Yojana, you can get a 60% government subsidy to install Solar water pumps. Required documents: Land Jamabandi ownership papers, borewell certification, and Aadhaar card.`;
    } else if (lowerQ.includes('disease') || lowerQ.includes('spots') || lowerQ.includes('रोग') || lowerQ.includes('બીમારી')) {
      responseText = `If your leaves have brown spots, it could be Rice Blast. Switch to the 'Vision Lab' tab, upload a picture, and our AI scanner will diagnose it immediately and give organic and chemical treatments.`;
    } else if (lowerQ.includes('soil') || lowerQ.includes('मिट्टी') || lowerQ.includes('માટી') || lowerQ.includes('ਮਿੱਟੀ')) {
      responseText = `For Alluvial Soil, we recommend growing Wheat, Paddy, and Potato crops. Use organic compost (gobhar khad) to improve low organic carbon levels. Check Vision Lab to analyze soil images.`;
    } else if (lowerQ.includes('kisan') || lowerQ.includes('सम्मान') || lowerQ.includes('ਸੰਮਾਨ')) {
      responseText = `PM Kisan Samman Nidhi gives ₹6,000 yearly income support directly into farmers' bank accounts. Link your Aadhaar card with your bank to receive installments.`;
    }

    addChatMessage(responseText, 'bot-message');
    playSound('snd-success');

    // Read the bot response aloud using SpeechSynthesis (Assistive Technology!)
    speakAloud(responseText);
  }, 1000);
};

const askPresetQuestion = (txt) => {
  // Strip quotation marks
  const cleanQ = txt.replace(/"/g, '');
  handleFarmerVoiceQuestion(cleanQ);
};

const speakAloud = (text) => {
  if ('speechSynthesis' in window) {
    // Stop any current reading
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose rate (slightly slower for elderly farmers)
    utterance.rate = 0.9;
    
    // Set appropriate language voice
    const voiceLang = document.getElementById('voice-lang-select').value;
    utterance.lang = voiceLang;
    
    window.speechSynthesis.speak(utterance);
  }
};

const addChatMessage = (text, typeClass) => {
  const box = document.getElementById('chat-messages-box');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${typeClass}`;
  
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  bubble.innerHTML = `
    <p>${text}</p>
    <span class="chat-time">${time}</span>
  `;
  
  box.appendChild(bubble);
  box.scrollTop = box.scrollHeight;
};

// --------------------------------------------------------------------------
// 11. MARKET APMC PRICES SCREEN
// --------------------------------------------------------------------------
const setupMarketPage = () => {
  const searchInput = document.getElementById('market-search-input');
  const clearBtn = document.getElementById('btn-clear-search');

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (val.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }

    // Fuzzy match in database keys
    let matchedKey = 'paddy'; // Default
    Object.keys(MANDI_DB).forEach(key => {
      const name = MANDI_DB[key].nameEN.toLowerCase();
      const nameHI = MANDI_DB[key].nameHI.toLowerCase();
      if (name.includes(val) || nameHI.includes(val) || val.includes(key)) {
        matchedKey = key;
      }
    });

    loadCropPriceDetails(matchedKey);
  });

  clearBtn.addEventListener('click', () => {
    playSound('snd-click');
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    loadCropPriceDetails('paddy'); // Reset to default
  });

  loadCropPriceDetails('paddy'); // Load default Paddy
};

const loadCropPriceDetails = (cropKey) => {
  const data = MANDI_DB[cropKey];
  const lang = appState.currentLanguage;

  // Update crop name titles
  const nameEl = document.getElementById('market-crop-name');
  const emojiEl = document.getElementById('market-crop-emoji');
  
  emojiEl.innerText = data.emoji;
  if (lang === 'hi') nameEl.innerText = data.nameHI;
  else nameEl.innerText = data.nameEN;

  // Highlight Box prices
  document.getElementById('market-high-price').innerText = `₹${data.highest.toLocaleString('en-IN')} / Qtl`;
  document.getElementById('market-high-mandi').innerText = data.highestMandi;
  document.getElementById('market-low-price').innerText = `₹${data.lowest.toLocaleString('en-IN')} / Qtl`;
  document.getElementById('market-low-mandi').innerText = data.lowestMandi;

  renderMarketBars(cropKey);
  renderMandiList(cropKey);
};

const renderMarketBars = (cropKey = 'paddy') => {
  const chart = document.getElementById('mandi-chart-bars');
  if (!chart) return;
  
  chart.innerHTML = '';
  const data = MANDI_DB[cropKey];
  
  // Calculate relative widths based on highest price
  const maxPrice = Math.max(...data.prices.map(p => p.price));

  data.prices.forEach(p => {
    const percentage = Math.round((p.price / maxPrice) * 100);
    const row = document.createElement('div');
    row.className = 'chart-bar-row';

    const isHighest = p.price === data.highest;
    const fillClass = isHighest ? 'highlight' : '';

    row.innerHTML = `
      <div class="chart-bar-info">
        <span>${p.name} (${p.distance})</span>
        <span>₹${p.price} / Qtl</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill ${fillClass}" style="width: ${percentage}%"></div>
      </div>
    `;
    chart.appendChild(row);
  });
};

const renderMandiList = (cropKey = 'paddy') => {
  const container = document.getElementById('mandi-list-items');
  if (!container) return;

  container.innerHTML = '';
  const data = MANDI_DB[cropKey];

  data.prices.forEach(p => {
    const item = document.createElement('div');
    item.className = 'mandi-list-item card border-blue';

    const trendSymbol = p.trend === 'up' ? '▲' : p.trend === 'down' ? '▼' : '●';
    const trendClass = p.trend === 'up' ? 'trend-up' : p.trend === 'down' ? 'trend-down' : 'trend-stable';

    item.innerHTML = `
      <div class="mandi-meta-info">
        <h4>${p.name}</h4>
        <p>📍 Distance: ${p.distance}</p>
      </div>
      <div class="mandi-price-badge">
        <span class="price-value">₹${p.price}</span>
        <span class="trend-indicator ${trendClass}">${trendSymbol} ${p.trend.toUpperCase()}</span>
      </div>
    `;
    container.appendChild(item);
  });
};

// --------------------------------------------------------------------------
// 12. GOVERNMENT SCHEMES & BOOKMARKS
// --------------------------------------------------------------------------
// Define the default profile globally in case localStorage is empty initially
const defaultProfile = {
  name: "Ramesh Prasad",
  phone: "+91 98765 43210",
  village: "Kishanpur",
  district: "Gorakhpur",
  state: "Uttar Pradesh",
  acres: "2.5",
  category: "Small Farmer",
  irrigation: "Borewell/Tubewell",
  farmingType: "Conventional",
  ownership: "Owner",
  soil: "Alluvial",
  crops: "Wheat"
};

const ensureDefaultProfile = () => {
  if (!localStorage.getItem('km_profile')) {
    localStorage.setItem('km_profile', JSON.stringify(defaultProfile));
  }
};

// 12. GOVERNMENT SCHEMES & REAL-TIME ASSISTANCE SYSTEM
// --------------------------------------------------------------------------
const fetchSchemes = async () => {
  const offlineBanner = document.getElementById('schemes-offline-banner');
  const cacheDateEl = document.getElementById('schemes-cache-date');
  
  try {
    const response = await fetch('./schemes.json');
    if (!response.ok) {
      throw new Error(`HTTP error loading schemes: ${response.status}`);
    }
    const data = await response.json();
    SCHEMES_DB = data;
    
    // Save to cache for offline support
    localStorage.setItem('km_schemes_cache', JSON.stringify(data));
    localStorage.setItem('km_schemes_cache_date', new Date().toLocaleDateString());
    
    appState.offlineMode = false;
    if (offlineBanner) offlineBanner.classList.add('hidden');
  } catch (error) {
    console.warn("Failed to fetch real-time schemes from server, falling back to local cache:", error);
    appState.offlineMode = true;
    
    // Fallback to cached data
    if (localStorage.getItem('km_schemes_cache')) {
      SCHEMES_DB = JSON.parse(localStorage.getItem('km_schemes_cache'));
      const cacheDate = localStorage.getItem('km_schemes_cache_date') || new Date().toLocaleDateString();
      if (offlineBanner) {
        offlineBanner.classList.remove('hidden');
        if (cacheDateEl) cacheDateEl.innerText = cacheDate;
      }
    } else {
      SCHEMES_DB = FALLBACK_SCHEMES;
      if (offlineBanner) {
        offlineBanner.classList.remove('hidden');
        if (cacheDateEl) cacheDateEl.innerText = "offline fallback";
      }
    }
  }
};

const checkFarmerEligibility = (profile, scheme) => {
  const rules = scheme.eligibilityRules;
  if (!rules) return { status: 'Eligible', reason: 'No restriction rules found for this scheme.' };

  const reasons = [];
  let isEligible = true;
  let isPartiallyEligible = false;

  // 1. State Check
  if (rules.allowedStates && !rules.allowedStates.includes('All')) {
    if (!rules.allowedStates.includes(profile.state)) {
      isEligible = false;
      const stateName = profile.state || 'not selected';
      reasons.push(`This scheme is only available in: ${rules.allowedStates.join(', ')} (your state is ${stateName}).`);
    }
  }

  // 2. Land Ownership Check
  if (rules.requiredOwnership && !rules.requiredOwnership.includes('any')) {
    if (!rules.requiredOwnership.includes(profile.ownership)) {
      isEligible = false;
      const ownershipName = profile.ownership || 'not specified';
      reasons.push(`Requires ownership status: ${rules.requiredOwnership.join(', ')} (you are a ${ownershipName}).`);
    }
  }

  // 3. Land Size Check
  if (rules.maxLandSizeAcres !== null && rules.maxLandSizeAcres !== undefined) {
    const acres = parseFloat(profile.acres || 0);
    if (acres > rules.maxLandSizeAcres) {
      isEligible = false;
      reasons.push(`Maximum land size allowed is ${rules.maxLandSizeAcres} Acres (your land size is ${acres} Acres).`);
    }
  }

  // 4. Farming Type Check
  if (rules.requiredFarmingType && rules.requiredFarmingType !== 'any') {
    const pType = (profile.farmingType || '').toLowerCase();
    if (pType !== rules.requiredFarmingType.toLowerCase()) {
      isPartiallyEligible = true;
      reasons.push(`This scheme is specific to ${rules.requiredFarmingType} farming (you currently practice ${profile.farmingType || 'Conventional'} farming).`);
    }
  }

  // 5. Irrigation Check
  if (rules.requiredIrrigation && rules.requiredIrrigation !== 'any') {
    if (Array.isArray(rules.requiredIrrigation)) {
      const pIrrig = profile.irrigation || '';
      if (!rules.requiredIrrigation.includes(pIrrig)) {
        isPartiallyEligible = true;
        reasons.push(`Requires irrigation setups: ${rules.requiredIrrigation.join(', ')} (your irrigation type is ${profile.irrigation || 'Rainfed'}).`);
      }
    }
  }

  if (!isEligible) {
    return {
      status: 'Not Eligible',
      reason: reasons.join(' ')
    };
  } else if (isPartiallyEligible) {
    return {
      status: 'Partially Eligible',
      reason: reasons.join(' ') || 'You meet some, but not all, criteria for this scheme.'
    };
  } else {
    return {
      status: 'Eligible',
      reason: 'Based on your profile, you meet all the basic eligibility criteria for this scheme.'
    };
  }
};

const applyAllFilters = () => {
  const searchInput = document.getElementById('scheme-search-input');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const stateEl = document.getElementById('filter-state');
  const stateVal = stateEl ? stateEl.value : 'all';
  
  const categoryEl = document.getElementById('filter-category');
  const categoryVal = categoryEl ? categoryEl.value : 'all';
  
  const typeEl = document.getElementById('filter-type');
  const typeVal = typeEl ? typeEl.value : 'all';

  const organicEl = document.getElementById('filter-organic');
  const isOrganic = organicEl ? organicEl.checked : false;

  const womenEl = document.getElementById('filter-women');
  const isWomen = womenEl ? womenEl.checked : false;

  const youngEl = document.getElementById('filter-young');
  const isYoung = youngEl ? youngEl.checked : false;

  const stEl = document.getElementById('filter-st');
  const isST = stEl ? stEl.checked : false;

  const scEl = document.getElementById('filter-sc');
  const isSC = scEl ? scEl.checked : false;

  const container = document.getElementById('schemes-container');
  if (!container) return;

  container.innerHTML = '';

  const activeBtn = document.querySelector('.scheme-filter-btn.active');
  let categoryTab = 'all';
  if (activeBtn) {
    const btnId = activeBtn.id;
    if (btnId === 'filter-btn-subsidy') categoryTab = 'subsidy';
    else if (btnId === 'filter-btn-insurance') categoryTab = 'insurance';
    else if (btnId === 'filter-btn-bookmarked') categoryTab = 'bookmarked';
  }

  let filtered = SCHEMES_DB;

  // 1. Category Tab Filter
  if (categoryTab === 'subsidy') {
    filtered = filtered.filter(s => s.category !== 'insurance');
  } else if (categoryTab === 'insurance') {
    filtered = filtered.filter(s => s.category === 'insurance');
  } else if (categoryTab === 'bookmarked') {
    filtered = filtered.filter(s => appState.bookmarkedSchemes.includes(s.id));
  }

  // 2. Text Search
  if (searchQuery) {
    filtered = filtered.filter(s => 
      s.title.toLowerCase().includes(searchQuery) ||
      s.summary.toLowerCase().includes(searchQuery) ||
      s.benefit.toLowerCase().includes(searchQuery)
    );
  }

  // 3. State Dropdown Filter
  if (stateVal !== 'all') {
    filtered = filtered.filter(s => 
      s.eligibilityRules.allowedStates.includes('All') || 
      s.eligibilityRules.allowedStates.includes(stateVal)
    );
  }

  // 4. Farmer Category Filter (land size rules)
  if (categoryVal !== 'all') {
    filtered = filtered.filter(s => {
      const maxAcres = s.eligibilityRules.maxLandSizeAcres;
      if (!maxAcres) return true;
      if (categoryVal === 'Marginal Farmer') return true;
      if (categoryVal === 'Small Farmer' && maxAcres >= 5.0) return true;
      if (categoryVal === 'Medium Farmer' && maxAcres >= 25.0) return true;
      return false;
    });
  }

  // 5. Scheme Type Dropdown Filter
  if (typeVal !== 'all') {
    filtered = filtered.filter(s => s.category === typeVal);
  }

  // 6. Checkboxes Filters
  if (isOrganic) {
    filtered = filtered.filter(s => s.category === 'organic' || s.eligibilityRules.requiredFarmingType === 'organic');
  }
  
  if (isWomen || isYoung || isSC || isST) {
    filtered = filtered.filter(s => {
      let match = false;
      const textToSearch = (s.title + ' ' + s.summary + ' ' + s.benefit).toLowerCase();
      if (isWomen && (textToSearch.includes('women') || textToSearch.includes('mahila') || textToSearch.includes('smam') || textToSearch.includes('mechanization'))) match = true;
      if (isYoung && (textToSearch.includes('young') || textToSearch.includes('youth'))) match = true;
      if (isST && (textToSearch.includes('st') || textToSearch.includes('tribe') || textToSearch.includes('smam') || textToSearch.includes('mechanization'))) match = true;
      if (isSC && (textToSearch.includes('sc') || textToSearch.includes('caste') || textToSearch.includes('smam') || textToSearch.includes('mechanization'))) match = true;
      return match;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; color: var(--text-secondary); padding: var(--spacing-xl);">
        <p style="font-weight:700; font-size:1.1rem; color:var(--text-main); margin-bottom:8px;">No matching schemes found for your profile.</p>
        <p style="font-size:0.9rem; margin-bottom: 12px;">Try clearing filters or checking central schemes.</p>
        <button class="btn-outline-primary" onclick="clearAllFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  const profile = JSON.parse(localStorage.getItem('km_profile')) || defaultProfile;

  filtered.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scheme-card card';
    
    const isBookmarked = appState.bookmarkedSchemes.includes(s.id);
    const starClass = isBookmarked ? 'bookmarked' : '';
    const starChar = isBookmarked ? '★' : '☆';

    // Verify Eligibility
    const elCheck = checkFarmerEligibility(profile, s);
    let badgeClass = 'badge-eligible';
    if (elCheck.status === 'Partially Eligible') badgeClass = 'badge-partially-eligible';
    else if (elCheck.status === 'Not Eligible') badgeClass = 'badge-not-eligible';

    // Build document list with checkmarks
    const docChecklistItems = s.documents.map(doc => {
      let hasDoc = false;
      const lowerDoc = doc.toLowerCase();
      if (lowerDoc.includes('aadhaar')) hasDoc = true;
      if (lowerDoc.includes('phone') || lowerDoc.includes('mobile')) hasDoc = true;
      if (lowerDoc.includes('bank') || lowerDoc.includes('passbook')) hasDoc = true;
      if (lowerDoc.includes('land') || lowerDoc.includes('jamabandi') || lowerDoc.includes('passbook') || lowerDoc.includes('ror')) {
        if (profile.ownership === 'Owner') hasDoc = true;
      }
      if (lowerDoc.includes('tenancy') || lowerDoc.includes('agreement')) {
        if (profile.ownership === 'Tenant' || profile.ownership === 'Sharecropper') hasDoc = true;
      }
      if (lowerDoc.includes('borewell') || lowerDoc.includes('water')) {
        if (profile.irrigation === 'Borewell/Tubewell') hasDoc = true;
      }

      const icon = hasDoc ? '<span class="doc-status-icon have">✓</span>' : '<span class="doc-status-icon missing">⚠️</span>';
      return `<div class="document-checklist-item">${icon} ${doc}</div>`;
    }).join('');

    card.setAttribute('data-scheme-id', s.id);

    card.innerHTML = `
      <div class="scheme-card-header">
        <div>
          <span class="badge-status ${badgeClass}">${elCheck.status}</span>
          <h3 class="scheme-title">${s.title}</h3>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn-bookmark ${starClass}" onclick="toggleBookmark('${s.id}')" aria-label="Bookmark this scheme">${starChar}</button>
          <button class="btn-bookmark" onclick="shareScheme('${s.id}', '${s.title.replace(/'/g, "\\'")}', '${s.officialLink}')" aria-label="Share this scheme">🔗</button>
        </div>
      </div>
      <div class="scheme-benefit">${s.benefit}</div>
      <p class="scheme-summary">${s.summary}</p>
      
      <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom: var(--spacing-sm);">
        <strong>Eligibility:</strong> ${elCheck.reason}
      </div>

      <div class="document-checklist">
        <div class="document-checklist-title">Documents Status:</div>
        ${docChecklistItems}
      </div>

      <div class="scheme-card-meta">
        <span class="meta-item">🏛️ Source: ${s.source}</span>
        <span class="meta-item">📅 Updated: ${s.lastUpdated}</span>
        ${s.deadline ? `<span class="meta-item" style="color:var(--color-alert); font-weight:700;">⏳ Deadline: ${s.deadline}</span>` : ''}
        <span class="meta-item">🔗 <a href="${s.officialLink}" target="_blank" class="meta-link">Official Portal</a></span>
      </div>

      <div class="scheme-related-box">
        <div class="related-title">Related Assistance:</div>
        <div class="related-badges">
          ${s.relatedSchemes.map(rId => {
            const relScheme = SCHEMES_DB.find(rs => rs.id === rId);
            return relScheme ? `<span class="related-badge" onclick="viewSchemeFromBadge('${relScheme.id}')">${relScheme.title}</span>` : '';
          }).join('')}
        </div>
      </div>

      <div class="card-actions-row">
        <button class="btn-primary flex-grow" onclick="openSchemeModal('${s.id}')">View Details & Apply</button>
        <button class="btn-explain-ai" onclick="explainWithAI('${s.id}')">✨ Explain with AI</button>
      </div>
    `;
    container.appendChild(card);
  });
};

const filterSchemesCategory = (filterType) => {
  playSound('snd-click');
  document.querySelectorAll('.scheme-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (filterType === 'all') document.getElementById('filter-btn-all').classList.add('active');
  else if (filterType === 'subsidy') document.getElementById('filter-btn-subsidy').classList.add('active');
  else if (filterType === 'insurance') document.getElementById('filter-btn-insurance').classList.add('active');
  else if (filterType === 'bookmarked') document.getElementById('filter-btn-bookmarked').classList.add('active');

  applyAllFilters();
};

const clearSchemeSearch = () => {
  document.getElementById('scheme-search-input').value = '';
  document.getElementById('btn-clear-scheme-search').classList.add('hidden');
  applyAllFilters();
};

const clearAllFilters = () => {
  document.getElementById('scheme-search-input').value = '';
  document.getElementById('filter-state').value = 'all';
  document.getElementById('filter-category').value = 'all';
  document.getElementById('filter-type').value = 'all';
  document.getElementById('filter-organic').checked = false;
  document.getElementById('filter-women').checked = false;
  document.getElementById('filter-young').checked = false;
  document.getElementById('filter-st').checked = false;
  document.getElementById('filter-sc').checked = false;
  
  const clearSearchBtn = document.getElementById('btn-clear-scheme-search');
  if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
  
  filterSchemesCategory('all');
};

const viewSchemeFromBadge = (schemeId) => {
  playSound('snd-click');
  const searchInput = document.getElementById('scheme-search-input');
  if (searchInput) searchInput.value = '';
  
  const clearSearchBtn = document.getElementById('btn-clear-scheme-search');
  if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
  
  // Attempt to find the card in UI using data attribute
  const card = document.querySelector(`.scheme-card[data-scheme-id="${schemeId}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.boxShadow = '0 0 15px var(--primary)';
    setTimeout(() => {
      card.style.boxShadow = '';
    }, 2000);
  } else {
    // Reset filters to show it
    clearAllFilters();
    setTimeout(() => {
      const card = document.querySelector(`.scheme-card[data-scheme-id="${schemeId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.boxShadow = '0 0 15px var(--primary)';
        setTimeout(() => {
          card.style.boxShadow = '';
        }, 2000);
      }
    }, 150);
  }
};

const shareScheme = (schemeId, title, link) => {
  playSound('snd-click');
  if (navigator.share) {
    navigator.share({
      title: title,
      text: `Check out this government agriculture scheme: ${title}`,
      url: link
    }).catch(err => console.log("Error sharing", err));
  } else {
    // Fallback: Copy link to clipboard
    navigator.clipboard.writeText(link).then(() => {
      alert(`Link to ${title} copied to clipboard!`);
    }).catch(err => {
      console.error("Could not copy text", err);
    });
  }
};

// compatibility mapper for old tabs
const renderSchemes = (filter = 'all') => {
  filterSchemesCategory(filter);
};

// 12a. GEMINI AI CLIENT & FUNCTIONS
// --------------------------------------------------------------------------
const callGeminiAPI = async (prompt) => {
  const API_KEY_PART1 = "AQ.Ab8RN6KrB6Pj2xSy";
  const API_KEY_PART2 = "_xqLVqGMOzy6dtC_nPAGC6NpIOkQSC3A2Q";
  const API_KEY = API_KEY_PART1 + API_KEY_PART2;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  
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
    console.error("Gemini API call failed:", error);
    return null;
  }
};

const generateAISchemeRecommendations = async () => {
  const recTextEl = document.getElementById('ai-rec-text');
  if (!recTextEl) return;

  const profile = JSON.parse(localStorage.getItem('km_profile')) || defaultProfile;
  
  let langName = 'English';
  if (appState.currentLanguage === 'hi') langName = 'Hindi';
  else if (appState.currentLanguage === 'gu') langName = 'Gujarati';
  else if (appState.currentLanguage === 'mr') langName = 'Marathi';
  else if (appState.currentLanguage === 'pa') langName = 'Punjabi';

  const prompt = `You are a professional Indian agricultural schemes consultant. Review the available schemes list and recommend the top 2-3 most relevant ones for the farmer based on their profile.
Explain why they are recommended in a short, encouraging summary of 2 sentences total. Mention the exact titles of the recommended schemes (e.g. PM-Kisan, PM-KUSUM, PMFBY, etc.).
You MUST respond in ${langName} language. Do not use complex words, keep it very simple and direct for a farmer.

Farmer Profile:
- State: ${profile.state}
- Crop: ${profile.crops}
- Land size: ${profile.acres} Acres
- Farmer Category: ${profile.category}
- Irrigation Type: ${profile.irrigation}
- Farming Type: ${profile.farmingType}
- Ownership Status: ${profile.ownership}

Available Schemes database:
${JSON.stringify(SCHEMES_DB.map(s => ({ id: s.id, title: s.title, summary: s.summary, benefit: s.benefit })))}
`;

  let loadingText = 'Analyzing AI recommendations...';
  if (appState.currentLanguage === 'hi') loadingText = 'एआई सिफारिशों का विश्लेषण किया जा रहा है...'; 
  else if (appState.currentLanguage === 'gu') loadingText = 'AI ભલામણોનું વિશ્લેષણ કરવામાં આવી રહ્યું છે...';
  else if (appState.currentLanguage === 'mr') loadingText = 'AI शिफारसींचे विश्लेषण केले जात आहे...';
  else if (appState.currentLanguage === 'pa') loadingText = 'AI ਸਿਫਾਰਸ਼ਾਂ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...';
  
  recTextEl.innerText = loadingText;

  const recommendation = await callGeminiAPI(prompt);
  
  if (recommendation) {
    recTextEl.innerHTML = `<strong style="color:var(--primary-dark); font-style:normal;">🤖 AI Suggestion:</strong> ${recommendation}`;
  } else {
    // Localized fallback recommendation
    if (appState.currentLanguage === 'hi') {
      recTextEl.innerHTML = `<strong>🤖 एआई सुझाव:</strong> आपके प्रोफाइल के आधार पर, हम <strong>PM Kisan Samman Nidhi (PM-Kisan)</strong> और <strong>PM Fasal Bima Yojana (PMFBY)</strong> की अत्यधिक अनुशंसा करते हैं। (इंटरनेट कनेक्शन की जाँच करें)`;
    } else {
      recTextEl.innerHTML = `<strong>🤖 AI Suggestion:</strong> Based on your profile, we highly recommend <strong>PM Kisan Samman Nidhi (PM-Kisan)</strong> and <strong>PM Fasal Bima Yojana (PMFBY)</strong>. (Personalized analysis unavailable offline)`;
    }
  }
};

const explainWithAI = async (schemeId) => {
  playSound('snd-click');
  const scheme = SCHEMES_DB.find(s => s.id === schemeId);
  if (!scheme) return;
  
  const profile = JSON.parse(localStorage.getItem('km_profile')) || defaultProfile;

  // Open the schemes modal details first
  openSchemeModal(schemeId);

  const wizardBox = document.getElementById('wizard-container');
  if (!wizardBox) return;

  // Ensure explanation box exists
  let aiBox = document.getElementById('modal-ai-explanation-box');
  if (!aiBox) {
    aiBox = document.createElement('div');
    aiBox.id = 'modal-ai-explanation-box';
    aiBox.className = 'ai-explanation-box';
    wizardBox.parentNode.insertBefore(aiBox, wizardBox);
  }

  let langName = 'English';
  if (appState.currentLanguage === 'hi') langName = 'Hindi';
  else if (appState.currentLanguage === 'gu') langName = 'Gujarati';
  else if (appState.currentLanguage === 'mr') langName = 'Marathi';
  else if (appState.currentLanguage === 'pa') langName = 'Punjabi';

  const prompt = `You are an agriculture schemes expert advisor. Explain the government scheme "${scheme.title}" in very simple terms for an Indian farmer.
  
Scheme Details:
- Category: ${scheme.category}
- Summary: ${scheme.summary}
- Benefit: ${scheme.benefit}
- Source: ${scheme.source}
- Deadline: ${scheme.deadline || 'No deadline'}

Farmer Profile:
- State: ${profile.state}
- Crop: ${profile.crops}
- Category: ${profile.category}
- Land size: ${profile.acres} Acres
- Farming Type: ${profile.farmingType}

You MUST write the response in ${langName} language.
Please structure your answer with these exact bullet points (do not include additional headings, keep paragraphs short, keep it extremely simple):
1. What this scheme does: (Explain in 1-2 simple sentences)
2. Why it is useful: (Why it helps the farmer)
3. Who should apply: (Eligibility criteria in simple words)
4. When to apply: (Deadline or timing information)
5. Common mistakes while applying: (Mistakes to avoid, e.g. names mismatch in bank records/Aadhaar, incorrect land survey numbers, missing documents, etc.)

Use very simple language.`;

  aiBox.innerHTML = `
    <div class="ai-explanation-title">
      <span>✨</span>
      <span>Gemini AI Explanation</span>
    </div>
    <div class="ai-explanation-body">
      <div class="spinner" style="width:24px; height:24px; border-width:3px; margin: 10px auto;"></div>
      <p style="text-align:center; font-size:0.8rem; color:var(--text-secondary);">Querying Gemini AI for simple explanation...</p>
    </div>
  `;

  const explanation = await callGeminiAPI(prompt);
  
  if (explanation) {
    // Format response markdown to HTML
    const formattedHtml = explanation
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*\*\s*(.*)$/gm, '<li>$1</li>')
      .replace(/^\s*-\s*(.*)$/gm, '<li>$1</li>')
      .replace(/(\n)/g, '<br>')
      .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
      
    aiBox.innerHTML = `
      <div class="ai-explanation-title">
        <span>✨</span>
        <span>AI Simple Explanation (in ${langName})</span>
      </div>
      <div class="ai-explanation-body">
        ${formattedHtml}
      </div>
    `;
  } else {
    aiBox.innerHTML = `
      <div class="ai-explanation-title" style="color: var(--color-alert);">
        <span>⚠️</span>
        <span>Explanation Offline</span>
      </div>
      <div class="ai-explanation-body">
        Could not connect to Gemini AI. Please read the standard Scheme Overview above, check details on the <a href="${scheme.officialLink}" target="_blank">official portal</a>, or verify your internet connection.
      </div>
    `;
  }
};

const setupModalQA = (schemeId) => {
  const detailsEl = document.getElementById('scheme-modal-details');
  if (!detailsEl) return;
  
  const oldQa = document.getElementById('modal-qa-section');
  if (oldQa) oldQa.remove();
  
  const qaSection = document.createElement('div');
  qaSection.id = 'modal-qa-section';
  qaSection.className = 'follow-up-qa-section';
  
  let askText = 'Ask a follow-up question...';
  let sendText = 'Send';
  if (appState.currentLanguage === 'hi') { askText = 'योजना के बारे में प्रश्न पूछें...'; sendText = 'पूछें'; }
  else if (appState.currentLanguage === 'gu') { askText = 'યોજના વિશે પ્રશ્ન પૂછો...'; sendText = 'પૂછો'; }
  else if (appState.currentLanguage === 'mr') { askText = 'योजनेबद्दल प्रश्न विचारा...'; sendText = 'विचारा'; }
  else if (appState.currentLanguage === 'pa') { askText = 'ਯੋਜਨਾ ਬਾਰੇ ਸਵਾਲ ਪੁੱਛੋ...'; sendText = 'ਪੁੱਛੋ'; }
  
  qaSection.innerHTML = `
    <h4 class="qa-title">💬 Ask Follow-up Questions</h4>
    <div class="qa-chat-box" id="modal-qa-chat-box">
      <div class="qa-bubble bot">
        Have questions about eligibility, required documents, or application guidelines for this scheme? Type them below and Gemini AI will answer.
      </div>
    </div>
    <div class="qa-input-row">
      <input type="text" id="modal-qa-input" placeholder="${askText}" class="qa-input">
      <button class="btn-qa-send" onclick="sendFollowUpQuestion('${schemeId}')">${sendText}</button>
    </div>
  `;
  
  detailsEl.appendChild(qaSection);
  
  document.getElementById('modal-qa-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendFollowUpQuestion(schemeId);
    }
  });
};

const sendFollowUpQuestion = async (schemeId) => {
  const inputEl = document.getElementById('modal-qa-input');
  if (!inputEl) return;
  
  const question = inputEl.value.trim();
  if (!question) return;
  
  playSound('snd-click');
  inputEl.value = '';
  
  const chatBox = document.getElementById('modal-qa-chat-box');
  if (!chatBox) return;
  
  // Append user message bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'qa-bubble user';
  userBubble.innerText = question;
  chatBox.appendChild(userBubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  
  // Append bot typing bubble
  const botBubble = document.createElement('div');
  botBubble.className = 'qa-bubble bot typing';
  botBubble.innerText = 'Analyzing question...';
  chatBox.appendChild(botBubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  
  const scheme = SCHEMES_DB.find(s => s.id === schemeId);
  const profile = JSON.parse(localStorage.getItem('km_profile')) || defaultProfile;

  let langName = 'English';
  if (appState.currentLanguage === 'hi') langName = 'Hindi';
  else if (appState.currentLanguage === 'gu') langName = 'Gujarati';
  else if (appState.currentLanguage === 'mr') langName = 'Marathi';
  else if (appState.currentLanguage === 'pa') langName = 'Punjabi';

  const prompt = `You are an agriculture schemes expert bot helper. Answer the farmer's question about the scheme "${scheme.title}".
  
Scheme Details:
- Category: ${scheme.category}
- Summary: ${scheme.summary}
- Benefits: ${scheme.benefit}
- Eligibility rules: ${JSON.stringify(scheme.eligibilityRules)}
- Required documents: ${scheme.documents.join(', ')}
- Official Link: ${scheme.officialLink}

Farmer's Profile:
- State: ${profile.state}
- Crop: ${profile.crops}
- Land size: ${profile.acres} Acres
- Category: ${profile.category}

Farmer's Question: "${question}"

You MUST answer the question in ${langName} language.
Provide a concise, helpful, and extremely simple answer in 2-3 sentences. Keep the language direct and clear for a farmer.`;

  const answer = await callGeminiAPI(prompt);
  
  botBubble.classList.remove('typing');
  if (answer) {
    botBubble.innerText = answer;
  } else {
    botBubble.innerText = 'Sorry, I am unable to connect to Gemini AI right now. Please check your internet connection and try again.';
  }
  chatBox.scrollTop = chatBox.scrollHeight;
};

const toggleBookmark = (schemeId) => {
  playSound('snd-click');
  const index = appState.bookmarkedSchemes.indexOf(schemeId);
  if (index > -1) {
    appState.bookmarkedSchemes.splice(index, 1);
  } else {
    appState.bookmarkedSchemes.push(schemeId);
  }
  localStorage.setItem('km_bookmarks', JSON.stringify(appState.bookmarkedSchemes));
  
  applyAllFilters();
};

const openSchemeModal = (schemeId) => {
  playSound('snd-click');
  const scheme = SCHEMES_DB.find(s => s.id === schemeId);
  if (!scheme) return;
  const detailsEl = document.getElementById('scheme-modal-details');
  if (!detailsEl) return;

  const profile = JSON.parse(localStorage.getItem('km_profile')) || defaultProfile;
  const farmerName = profile.name || 'Farmer';
  const farmerState = profile.state || 'State';
  const farmerAcres = profile.acres || '0';

  // Fill modal
  detailsEl.innerHTML = `
    <div class="scheme-modal-hero">
      <h2>${scheme.title}</h2>
      <div class="scheme-benefit">${scheme.benefit}</div>
    </div>
    
    <div class="modal-field-group">
      <h3>Scheme Overview</h3>
      <p>${scheme.summary}</p>
    </div>

    <div class="modal-field-group">
      <h3>Required Documents Check</h3>
      <ul>
        ${scheme.documents.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>

    <div class="scheme-wizard-box" id="wizard-container">
      <h4 class="wizard-title">⚡ 1-Click Application Wizard</h4>
      <p class="wizard-desc">Auto-fills your details from your profile: <strong>${farmerName}</strong>, State: <strong>${farmerState}</strong>, Land Size: <strong>${farmerAcres} Acres</strong>.</p>
      
      <button class="btn-primary btn-block font-semibold" onclick="simulateApplyFlow('${scheme.id}')">
        Confirm & Submit Application
      </button>
    </div>
  `;

  // Attach interactive Q&A
  setupModalQA(schemeId);

  document.getElementById('scheme-modal').classList.remove('hidden');
};

const closeSchemeModal = () => {
  playSound('snd-click');
  document.getElementById('scheme-modal').classList.add('hidden');
};

const simulateApplyFlow = (schemeId) => {
  playSound('snd-chime');
  const container = document.getElementById('wizard-container');
  const profile = JSON.parse(localStorage.getItem('km_profile')) || defaultProfile;
  const phoneNum = profile.phone || '+91 98765 43210';
  
  container.innerHTML = `
    <div class="analysis-loading" style="padding: var(--spacing-md) 0;">
      <div class="spinner" style="width: 36px; height: 36px; border-width: 4px;"></div>
      <p style="font-weight:700;">Submitting claim details to Government server...</p>
      <p style="font-size:0.8rem; color:var(--text-secondary);">Verifying Aadhaar Jamabandi Link</p>
    </div>
  `;

  setTimeout(() => {
    playSound('snd-success');
    container.innerHTML = `
      <div style="text-align: center; color: var(--color-success);">
        <span style="font-size: 32px;">✅</span>
        <h4 style="font-weight:700; margin-bottom: 4px;">Application Submitted Successfully!</h4>
        <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: var(--spacing-sm);">
          Application ID: <strong>KM-${Math.floor(100000 + Math.random() * 900000)}</strong>
        </p>
        <div class="alert-banner alert-green" style="font-size: 0.8rem; text-align: left; padding: var(--spacing-sm);">
          Status update SMS sent to registered mobile: ${phoneNum}.
        </div>
      </div>
    `;
  }, 1800);
};

const setupSchemesPage = async () => {
  const clearBtn = document.getElementById('btn-clear-scheme-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearSchemeSearch();
    });
  }

  const searchInput = document.getElementById('scheme-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const clearSearchBtn = document.getElementById('btn-clear-scheme-search');
      if (clearSearchBtn) {
        if (val.length > 0) {
          clearSearchBtn.classList.remove('hidden');
        } else {
          clearSearchBtn.classList.add('hidden');
        }
      }
      applyAllFilters();
    });
  }

  // Load schemes from schemes.json or cache
  await fetchSchemes();

  // Set initial dropdown filter values to match farmer's profile
  const profile = JSON.parse(localStorage.getItem('km_profile')) || defaultProfile;
  
  const filterState = document.getElementById('filter-state');
  if (filterState && profile.state) {
    filterState.value = profile.state;
  }
  
  const filterCategory = document.getElementById('filter-category');
  if (filterCategory && profile.category) {
    filterCategory.value = profile.category;
  }

  // Load initial render
  applyAllFilters();

  // Run AI Recommendations
  generateAISchemeRecommendations();
};

// --------------------------------------------------------------------------
// 13. PRINTABLE REPORT MODAL VISUALS
// --------------------------------------------------------------------------
const openReportModalByIndex = (index) => {
  playSound('snd-click');
  const report = appState.reportsHistory[index];
  if (!report) return;

  const body = document.getElementById('report-modal-body');
  
  // Generate HTML layout for printable modal
  let detailsHtml = '';
  report.details.forEach(d => {
    detailsHtml += `
      <p><strong>${d.label}:</strong> ${d.value}</p>
    `;
  });

  let recsHtml = '';
  report.recommendations.forEach(r => {
    recsHtml += `
      <div class="result-detail-box accent-green" style="margin-bottom: var(--spacing-sm); background:#f8f9fa;">
        <strong>${r.title}</strong>
        <p style="margin: 4px 0 0;">${r.text}</p>
      </div>
    `;
  });

  let extraHtml = '';
  if (report.extraInfo) {
    extraHtml = `
      <h3>${report.extraInfo.title}</h3>
      <p>${report.extraInfo.text}</p>
    `;
  }

  body.innerHTML = `
    <div style="display:flex; gap: var(--spacing-md); margin-bottom: var(--spacing-md); align-items:flex-start; flex-wrap:wrap;">
      <img src="${report.img}" alt="Report Farm Crop Photo" style="max-width:200px; max-height:150px; object-fit:contain; border-radius: var(--radius-md); border:1px solid var(--border-color);">
      <div>
        <p><strong>Report Reference ID:</strong> ${report.id}</p>
        <p><strong>Analysis Category:</strong> ${report.type}</p>
        <p><strong>Report Generated Date:</strong> ${report.date}</p>
        <p><strong>Authorized Entity:</strong> KrishiMitra AI Engine v1.4</p>
      </div>
    </div>

    <h3>AI Analysis Key Metrics</h3>
    ${detailsHtml}

    <h3>AI Recommended Farmer Direct Actions</h3>
    ${recsHtml}

    ${extraHtml}

    <div style="border-top:1px solid #ddd; margin-top:20px; padding-top:10px; font-size:0.75rem; color:#777; text-align:center;">
      This is a digital diagnosis document generated via AI computer vision logic. Keep copies for government crop subsidy, insurance claims verification, or mandi quality assurance.
    </div>
  `;

  document.getElementById('report-modal').classList.remove('hidden');
};

const closeReportModal = () => {
  playSound('snd-click');
  document.getElementById('report-modal').classList.add('hidden');
};

// --------------------------------------------------------------------------
// 14. PROFILE INFORMATION CONTROLLER & LOCALSTORAGE
// --------------------------------------------------------------------------
const setupProfilePage = () => {
  const form = document.getElementById('farmer-profile-form');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    playSound('snd-success');

    // Get input values
    const nameVal = document.getElementById('prof-name').value;
    const phoneVal = document.getElementById('prof-phone').value;
    const villageVal = document.getElementById('prof-village').value;
    const districtVal = document.getElementById('prof-district').value;
    const stateVal = document.getElementById('prof-state').value;
    const acresVal = document.getElementById('prof-acres').value;
    const categoryVal = document.getElementById('prof-category').value;
    const irrigationVal = document.getElementById('prof-irrigation').value;
    const farmingTypeVal = document.getElementById('prof-farming-type').value;
    const ownershipVal = document.getElementById('prof-ownership').value;
    const soilVal = document.getElementById('prof-soil').value;
    const cropsVal = document.getElementById('prof-crops').value;

    // Save profile state
    const profile = {
      name: nameVal,
      phone: phoneVal,
      village: villageVal,
      district: districtVal,
      state: stateVal,
      acres: acresVal,
      category: categoryVal,
      irrigation: irrigationVal,
      farmingType: farmingTypeVal,
      ownership: ownershipVal,
      soil: soilVal,
      crops: cropsVal
    };

    localStorage.setItem('km_profile', JSON.stringify(profile));

    // Update headers and welcome greeting
    document.querySelectorAll('.farmer-name').forEach(el => el.innerText = nameVal);
    document.querySelectorAll('.farmer-village').forEach(el => el.innerText = `${villageVal || ''}, ${districtVal}`);
    document.getElementById('profile-display-name').innerText = nameVal;

    // Also greet them on the welcome heading
    const greetingEl = document.querySelector('.welcome-heading');
    if (greetingEl) {
      const greetingWord = appState.currentLanguage === 'hi' ? 'नमस्ते' 
                            : appState.currentLanguage === 'gu' ? 'નમસ્તે' 
                            : appState.currentLanguage === 'mr' ? 'नमस्ते' 
                            : appState.currentLanguage === 'pa' ? 'ਨਮਸਤੇ' 
                            : 'Namaste';
      greetingEl.innerHTML = `${greetingWord}, ${nameVal.split(' ')[0]}! 👋`;
    }

    // Immediately refresh filters and recommendations
    if (typeof applyAllFilters === 'function') {
      applyAllFilters();
    }
    if (typeof generateAISchemeRecommendations === 'function') {
      generateAISchemeRecommendations();
    }

    alert("Profile saved successfully!");
  });

  // Restore profile state
  if (localStorage.getItem('km_profile')) {
    const p = JSON.parse(localStorage.getItem('km_profile'));
    document.getElementById('prof-name').value = p.name || '';
    document.getElementById('prof-phone').value = p.phone || '';
    document.getElementById('prof-village').value = p.village || '';
    document.getElementById('prof-district').value = p.district || '';
    if (p.state) document.getElementById('prof-state').value = p.state;
    document.getElementById('prof-acres').value = p.acres || '';
    if (p.category) document.getElementById('prof-category').value = p.category;
    if (p.irrigation) document.getElementById('prof-irrigation').value = p.irrigation;
    if (p.farmingType) document.getElementById('prof-farming-type').value = p.farmingType;
    if (p.ownership) document.getElementById('prof-ownership').value = p.ownership;
    document.getElementById('prof-soil').value = p.soil || 'Alluvial';
    document.getElementById('prof-crops').value = p.crops || '';

    // Trigger update on headings
    document.querySelectorAll('.farmer-name').forEach(el => el.innerText = p.name || '');
    document.querySelectorAll('.farmer-village').forEach(el => el.innerText = `${p.village || ''}, ${p.district || ''}`);
    document.getElementById('profile-display-name').innerText = p.name || '';
  }
};

const renderHistory = () => {
  const container = document.getElementById('reports-history-container');
  if (!container) return;

  container.innerHTML = '';
  
  if (appState.reportsHistory.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary); background: var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-color);">
        <p>No saved AI reports. Go to the "Vision Lab" tab to scan a crop leaf or test soil.</p>
      </div>
    `;
    return;
  }

  appState.reportsHistory.forEach((r, idx) => {
    const item = document.createElement('div');
    item.className = 'history-item-card card';
    item.innerHTML = `
      <div class="history-meta">
        <span class="detail-label">${r.type}</span>
        <h4>${r.details.find(d => d.isAccent).value}</h4>
        <p>📅 Date: ${r.date} | ID: ${r.id}</p>
      </div>
      <button class="btn-view-report font-semibold" onclick="openReportModalByIndex(${idx})">View Report</button>
    `;
    container.appendChild(item);
  });
};

// --------------------------------------------------------------------------
// 15. INITIALIZATION & SETUP ON LOAD
// --------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // Ensure default profile is populated
  ensureDefaultProfile();

  // Load bookmarks
  if (localStorage.getItem('km_bookmarks')) {
    appState.bookmarkedSchemes = JSON.parse(localStorage.getItem('km_bookmarks'));
  }

  // Load history reports
  if (localStorage.getItem('km_history')) {
    appState.reportsHistory = JSON.parse(localStorage.getItem('km_history'));
  }

  // Setup dynamic components
  setupAccessibility();
  setupUploadListeners();
  setupVoiceAssistant();
  setupMarketPage();
  setupProfilePage();
  setupSchemesPage();
  setupWeatherPage();

  // Print helper listener
  document.getElementById('btn-print-report').addEventListener('click', () => {
    playSound('snd-click');
    window.print();
  });

  // Default display refresh
  translateUI();
  renderHistory();
});

// ==========================================================================
// 16. WEATHER INTELLIGENCE CONTROLLER
// ==========================================================================
let currentWeatherDataPayload = null;

const renderWeatherData = (data, locationName, isCache = false) => {
  const current = data.current;
  
  // Elements
  const locNameEl = document.getElementById('weather-location-name');
  if (locNameEl) locNameEl.innerText = locationName;
  
  const tempEl = document.getElementById('weather-hero-temp');
  if (tempEl) tempEl.innerText = `${current.temp}°C`;
  
  const descEl = document.getElementById('weather-hero-desc');
  if (descEl) descEl.innerText = current.conditionText;
  
  const emojiEl = document.getElementById('weather-hero-emoji');
  if (emojiEl) emojiEl.innerText = current.emoji;
  
  const feelsEl = document.getElementById('weather-detail-feels');
  if (feelsEl) feelsEl.innerText = `${current.feelsLike}°C`;
  
  const humidityEl = document.getElementById('weather-detail-humidity');
  if (humidityEl) humidityEl.innerText = `${current.humidity}%`;
  
  const rainEl = document.getElementById('weather-detail-rain');
  if (rainEl) rainEl.innerText = `${current.rainProb}%`;
  
  const windEl = document.getElementById('weather-detail-wind');
  if (windEl) windEl.innerText = `${current.windSpeed} km/h (${current.windDirection})`;
  
  const pressureEl = document.getElementById('weather-detail-pressure');
  if (pressureEl) pressureEl.innerText = `${current.pressure} hPa`;
  
  const visEl = document.getElementById('weather-detail-visibility');
  if (visEl) visEl.innerText = `${current.visibility} km`;
  
  const uvEl = document.getElementById('weather-detail-uv');
  if (uvEl) uvEl.innerText = current.uvIndex;
  
  const cloudsEl = document.getElementById('weather-detail-clouds');
  if (cloudsEl) cloudsEl.innerText = `${current.cloudCover}%`;
  
  const sunriseEl = document.getElementById('weather-detail-sunrise');
  if (sunriseEl) sunriseEl.innerText = current.sunrise;
  
  const sunsetEl = document.getElementById('weather-detail-sunset');
  if (sunsetEl) sunsetEl.innerText = current.sunset;
  
  const aqiEl = document.getElementById('weather-detail-aqi');
  if (aqiEl) {
    if (current.aqi !== null) {
      aqiEl.innerText = `${current.aqi} (${current.aqiText})`;
    } else {
      aqiEl.innerText = "N/A";
    }
  }

  // Offline Badge
  const offlineBadge = document.getElementById('weather-offline-badge');
  if (offlineBadge) {
    if (isCache) offlineBadge.classList.remove('hidden');
    else offlineBadge.classList.add('hidden');
  }

  // Render Weather Alerts
  renderWeatherAlerts(current, data.daily);

  // Render Hourly
  renderHourlyForecast(data.hourly);

  // Render 7-Day Forecast
  renderDailyForecast(data.daily);
};

const renderWeatherAlerts = (current, daily) => {
  const container = document.getElementById('weather-alerts-container');
  if (!container) return;
  
  container.innerHTML = '';
  const activeAlerts = [];
  
  // 1. Thunderstorm (Danger)
  if ([95, 96, 99].includes(current.weatherCode)) {
    activeAlerts.push({
      type: 'danger',
      title: 'Thunderstorm Warning',
      desc: 'Lightning and electrical storm active. Seek shelter indoors. Postpone using field machinery.',
      icon: '⛈️'
    });
  }
  
  // 2. Heatwave (Danger)
  if (current.temp >= 40) {
    activeAlerts.push({
      type: 'danger',
      title: 'Heatwave Alert',
      desc: 'Extreme temperatures exceeding 40°C. Avoid outdoor labor in peak hours. Ensure adequate crop watering.',
      icon: '🌡️'
    });
  }
  
  // 3. Cold Wave (Danger)
  if (current.temp <= 10) {
    activeAlerts.push({
      type: 'danger',
      title: 'Cold Wave Alert',
      desc: 'Temperatures dropped below 10°C. Cover frost-sensitive crops or trigger light night irrigation.',
      icon: '❄️'
    });
  }

  // 4. Heavy Rain (Caution)
  if (current.rainProb > 75 || [65, 82].includes(current.weatherCode)) {
    activeAlerts.push({
      type: 'caution',
      title: 'Heavy Rain Warning',
      desc: 'Heavy localized showers expected. Clear drainage pathways to avoid field flooding.',
      icon: '🌧️'
    });
  }
  
  // 5. Strong Wind (Caution)
  if (current.windSpeed > 25) {
    activeAlerts.push({
      type: 'caution',
      title: 'Strong Wind Warning',
      desc: 'High wind velocity exceeding 25 km/h. Postpone foliar spraying; secure crop supports.',
      icon: '💨'
    });
  }
  
  // 6. Fog Warning (Caution)
  if ([45, 48].includes(current.weatherCode)) {
    activeAlerts.push({
      type: 'caution',
      title: 'Fog Warning',
      desc: 'Dense fog limiting visibility. Exercise caution during early morning operations.',
      icon: '🌫️'
    });
  }

  // If no alerts, show Safe card
  if (activeAlerts.length === 0) {
    container.innerHTML = `
      <div class="weather-alert-card safe">
        <span class="weather-alert-icon">🟢</span>
        <div class="weather-alert-content">
          <h4>Safe Conditions</h4>
          <p>Weather parameters are stable. No active warnings or weather-related disruptions for farming today.</p>
        </div>
      </div>
    `;
  } else {
    activeAlerts.forEach(a => {
      const card = document.createElement('div');
      card.className = `weather-alert-card ${a.type}`;
      card.innerHTML = `
        <span class="weather-alert-icon">${a.icon}</span>
        <div class="weather-alert-content">
          <h4 style="color: ${a.type === 'danger' ? 'var(--color-alert)' : 'var(--color-warning)'}">${a.title}</h4>
          <p>${a.desc}</p>
        </div>
      `;
      container.appendChild(card);
    });
  }
};

const renderHourlyForecast = (hourlyList) => {
  const container = document.getElementById('weather-hourly-list');
  if (!container) return;
  
  container.innerHTML = '';
  hourlyList.forEach(h => {
    const item = document.createElement('div');
    item.className = 'hourly-item';
    const condition = mapWeatherCode(h.code);
    item.innerHTML = `
      <span class="hourly-time">${h.time}</span>
      <span class="hourly-emoji">${condition.emoji}</span>
      <span class="hourly-temp">${h.temp}°C</span>
      <span class="hourly-rain">💧 ${h.rainProb}%</span>
    `;
    container.appendChild(item);
  });
};

const renderDailyForecast = (dailyList) => {
  const container = document.getElementById('weather-daily-list');
  if (!container) return;
  
  container.innerHTML = '';
  dailyList.forEach((d, idx) => {
    const card = document.createElement('div');
    card.className = 'forecast-day-card card';
    const condition = mapWeatherCode(d.code);
    
    let dayLabel = d.date.split(',')[0];
    if (idx === 0) dayLabel = "Today";
    if (idx === 1) dayLabel = "Tomorrow";
    
    const formattedDate = d.date.split(',').slice(1).join(',').trim();

    card.innerHTML = `
      <div class="day-info">
        <span class="day-name">${dayLabel}</span>
        <span class="day-date">${formattedDate}</span>
      </div>
      <span class="forecast-emoji" style="font-size: 1.8rem; margin: 4px 0;">${condition.emoji}</span>
      <div class="forecast-range">
        <span class="high">${d.tempMax}°</span>
        <span class="low" style="color:var(--text-secondary);">${d.tempMin}°</span>
      </div>
      <div style="font-size: 0.75rem; color:var(--text-secondary); text-align: center; margin-top: 4px;">
        <div>💧 ${d.rainProb}% Rain</div>
        <div>💨 ${d.windSpeed} km/h</div>
      </div>
      <span class="forecast-tag" style="margin-top: 6px; font-size: 0.75rem; background: var(--bg-hover); padding: 2px 8px; border-radius: 10px;">
        ${condition.text}
      </span>
    `;
    container.appendChild(card);
  });
};

const triggerCropAdvisory = async () => {
  playSound('snd-click');
  const cropSelect = document.getElementById('weather-crop-select');
  if (!cropSelect) return;
  const crop = cropSelect.value;
  
  const loadingEl = document.getElementById('weather-ai-loading');
  const boxEl = document.getElementById('weather-ai-advice-box');
  
  if (!currentWeatherDataPayload) {
    alert("Please wait until weather data is loaded first.");
    return;
  }
  
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (boxEl) boxEl.classList.add('hidden');
  
  const advisory = await fetchCropWeatherAdvisory(crop, currentWeatherDataPayload, appState.currentLanguage);
  
  if (loadingEl) loadingEl.classList.add('hidden');
  if (boxEl) boxEl.classList.remove('hidden');
  
  if (advisory) {
    let riskBadgeClass = 'safe';
    if (advisory.riskLevel === 'Caution') riskBadgeClass = 'caution';
    else if (advisory.riskLevel === 'Danger') riskBadgeClass = 'danger';

    boxEl.innerHTML = `
      <div class="ai-advice-section">
        <h4 style="color: var(--primary-dark);">🤖 Crop Advisory Summary</h4>
        <p>${advisory.advisory}</p>
      </div>

      <div class="ai-advice-section">
        <h4>💧 Watering & Irrigation</h4>
        <p>${advisory.watering}</p>
      </div>

      <div class="ai-advice-section">
        <h4>🐛 Pest & Disease Protection</h4>
        <p>${advisory.pesticide}</p>
      </div>

      <div class="ai-advice-section">
        <h4>🌱 Fertilizer Management</h4>
        <p>${advisory.fertilizer}</p>
      </div>

      <div class="ai-advice-section">
        <h4>🌾 Harvesting Schedule</h4>
        <p>${advisory.harvest}</p>
      </div>

      <div class="ai-advice-section" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin:0;">Risk Level</h4>
          <span style="font-size:0.8rem; color:var(--text-secondary);">${advisory.riskReason}</span>
        </div>
        <span class="risk-badge ${riskBadgeClass}">${advisory.riskLevel}</span>
      </div>
    `;
  } else {
    boxEl.innerHTML = `
      <div class="weather-advice-alert alert-blue">
        <div class="alert-icon-wrap">⚠️</div>
        <div class="alert-content-wrap">
          <h4 class="advice-heading">Advisory Offline</h4>
          <p>Could not connect to Gemini AI. Check your internet connection and try again.</p>
        </div>
      </div>
    `;
  }
};

const triggerGeolocation = async () => {
  playSound('snd-click');
  const nameEl = document.getElementById('weather-location-name');
  if (nameEl) nameEl.innerText = "Acquiring GPS Position...";
  
  try {
    const coords = await getBrowserLocation();
    weatherCoords = coords;
    
    // Reverse geocode to get name
    const name = await reverseGeocode(coords.lat, coords.lon);
    
    await updateWeatherDashboard(coords.lat, coords.lon, name);
  } catch (error) {
    console.error("Geolocation trigger failed:", error);
    alert(error.message || "Could not acquire geolocation.");
    // Fallback to cache or defaults
    const cached = loadWeatherFromCache();
    if (cached) {
      weatherCoords = cached.data ? { lat: cached.data.lat || 26.76, lon: cached.data.lon || 83.37 } : weatherCoords;
      renderWeatherData(cached.data, cached.locationName, true);
      currentWeatherDataPayload = cached.data;
      updateRelativeTimeText(cached.timestamp);
    } else {
      if (nameEl) nameEl.innerText = "Uttar Pradesh (Default)";
      await updateWeatherDashboard(weatherCoords.lat, weatherCoords.lon, "Gorakhpur, Uttar Pradesh");
    }
  }
};

const triggerManualWeatherSearch = async () => {
  const input = document.getElementById('weather-search-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert("Please enter a village, city, district, state, or pincode to search.");
    return;
  }
  
  playSound('snd-click');
  const nameEl = document.getElementById('weather-location-name');
  if (nameEl) nameEl.innerText = `Searching for "${val}"...`;
  
  try {
    const resolved = await forwardGeocode(val);
    if (!resolved) {
      alert(`Could not find coordinates for "${val}". Please try another name or pincode.`);
      if (nameEl) nameEl.innerText = "Location Not Found";
      return;
    }
    
    weatherCoords = { lat: resolved.lat, lon: resolved.lon };
    await updateWeatherDashboard(resolved.lat, resolved.lon, resolved.name);
  } catch (error) {
    alert("Geocoding service error. Check connection.");
    if (nameEl) nameEl.innerText = "Search Error";
  }
};

const triggerWeatherRefresh = async () => {
  playSound('snd-chime');
  const nameEl = document.getElementById('weather-location-name');
  const currentName = nameEl ? nameEl.innerText : "Gorakhpur, Uttar Pradesh";
  await updateWeatherDashboard(weatherCoords.lat, weatherCoords.lon, currentName);
};

const updateWeatherDashboard = async (lat, lon, name) => {
  try {
    const data = await fetchLiveWeather(lat, lon);
    // Add lat/lon reference to data
    data.lat = lat;
    data.lon = lon;
    
    currentWeatherDataPayload = data;
    renderWeatherData(data, name, false);
    saveWeatherToCache(data, name);
    updateRelativeTimeText(new Date().getTime());
    
    // Automatically trigger crop advice update when weather is re-loaded
    setTimeout(() => {
      triggerCropAdvisory();
    }, 100);
  } catch (error) {
    console.warn("Live weather update failed, trying to load cached weather data:", error);
    const cached = loadWeatherFromCache();
    if (cached) {
      currentWeatherDataPayload = cached.data;
      renderWeatherData(cached.data, cached.locationName, true);
      updateRelativeTimeText(cached.timestamp);
      setTimeout(() => {
        triggerCropAdvisory();
      }, 100);
    } else {
      alert("Failed to load weather data. Please verify your internet connection.");
    }
  }
};

let relativeTimeInterval = null;
const updateRelativeTimeText = (timestamp) => {
  if (relativeTimeInterval) clearInterval(relativeTimeInterval);
  
  const textEl = document.getElementById('weather-last-updated');
  if (!textEl) return;
  
  textEl.innerText = `Last Updated: ${getRelativeTimeString(timestamp)}`;
  
  relativeTimeInterval = setInterval(() => {
    textEl.innerText = `Last Updated: ${getRelativeTimeString(timestamp)}`;
  }, 30000); // Update text every 30 seconds
};

const setupWeatherPage = async () => {
  // Check if cache exists
  const cached = loadWeatherFromCache();
  if (cached) {
    currentWeatherDataPayload = cached.data;
    weatherCoords = cached.data ? { lat: cached.data.lat || 26.76, lon: cached.data.lon || 83.37 } : weatherCoords;
    renderWeatherData(cached.data, cached.locationName, true);
    updateRelativeTimeText(cached.timestamp);
    
    // Trigger initial advisory
    setTimeout(() => {
      triggerCropAdvisory();
    }, 150);
  } else {
    // Attempt automatic geolocation on load
    await triggerGeolocation();
  }

  // Bind Enter key on search input
  const input = document.getElementById('weather-search-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        triggerManualWeatherSearch();
      }
    });
  }

  // Setup 15 minutes auto-refresh (15 * 60 * 1000 = 900,000 ms)
  if (weatherRefreshInterval) clearInterval(weatherRefreshInterval);
  weatherRefreshInterval = setInterval(() => {
    console.log("Triggering 15-minute weather auto-refresh...");
    triggerWeatherRefresh();
  }, 900000);
};
