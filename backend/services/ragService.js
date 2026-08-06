/* ==========================================================================
   KrishiMitra AI — RAG (Retrieval-Augmented Generation) Service
   Pipeline:
     Question → keyword extract → multi-domain search → collect docs →
     return formatted context string (ready to prepend to Gemma prompt)
   ========================================================================== */

'use strict';

const db = require('./databaseService');

// ── Domain routing map ────────────────────────────────────────────────────────
// Maps trigger keywords → which database search functions to call
const DOMAIN_TRIGGERS = [
  {
    domains:  ['disease', 'disease'],
    keywords: ['disease', 'bimari', 'infection', 'pest', 'blast', 'blight',
               'wilt', 'rot', 'mold', 'fungus', 'virus', 'rog', 'jhonka',
               'leaf curl', 'mosaic', 'yellowing', 'spots'],
    fn: q => db.searchDisease(q, 4)
  },
  {
    domains:  ['crop'],
    keywords: ['crop', 'fasal', 'paddy', 'wheat', 'rice', 'cotton', 'sugarcane',
               'maize', 'mustard', 'potato', 'tomato', 'soybean', 'dhaan',
               'gehu', 'gehun', 'kapas', 'arhar', 'moong', 'tur'],
    fn: q => db.searchCrop(q, 4)
  },
  {
    domains:  ['scheme'],
    keywords: ['scheme', 'yojana', 'subsidy', 'government', 'sarkar', 'apply',
               'form', 'insurance', 'kisan', 'loan', 'financial', 'pm',
               'pradhan mantri', 'mukhyamantri', 'beneficiary'],
    fn: q => db.searchScheme(q, 4)
  },
  {
    domains:  ['weather'],
    keywords: ['weather', 'rain', 'mausam', 'barish', 'temperature', 'cloud',
               'forecast', 'humidity', 'monsoon', 'storm', 'flood',
               'drought', 'baadal', 'garmi', 'sardi'],
    fn: q => db.searchWeather(q, 3)
  },
  {
    domains:  ['soil'],
    keywords: ['soil', 'mitti', 'clay', 'loam', 'sand', 'organic', 'ph',
               'moisture', 'domat', 'kaali', 'alluvial', 'regur',
               'soil test', 'mitti ki janch'],
    fn: q => db.searchSoil(q, 3)
  },
  {
    domains:  ['fertilizer'],
    keywords: ['fertilizer', 'khad', 'urea', 'dap', 'nitrogen', 'phosphorus',
               'potassium', 'npk', 'compost', 'gobhar', 'zinc', 'sulphate',
               'micro-nutrient', 'nutrition'],
    fn: q => db.searchFertilizer(q, 3)
  },
  {
    domains:  ['pesticide'],
    keywords: ['pesticide', 'keetnashak', 'spray', 'chemical', 'organic',
               'neem', 'imidacloprid', 'tricyclazole', 'fungicide',
               'insecticide', 'herbicide', 'weedicide', 'dose', 'ml',
               'gram per liter'],
    fn: q => db.searchPesticide(q, 3)
  },
  {
    domains:  ['mandi'],
    keywords: ['mandi', 'market', 'price', 'rate', 'bhav', 'apmc', 'sell',
               'bech', 'quintal', 'profit', 'income', 'bazar', 'sabzi mandi',
               'laxmipur', 'gorakhpur', 'kishanpur'],
    fn: q => db.searchMandi(q, 4)
  },
  {
    domains:  ['faq'],
    keywords: ['how', 'what', 'when', 'why', 'kaise', 'kya', 'kab', 'kyun',
               'help', 'guide', 'tips', 'advice', 'information'],
    fn: q => db.searchFAQ(q, 3)
  }
];

// ── Keyword extractor ─────────────────────────────────────────────────────────
/**
 * Extract search terms from the question.
 * Strips common stop words, returns meaningful tokens.
 *
 * @param {string} question
 * @returns {string[]}
 */
function extractKeywords(question) {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
    'if', 'so', 'my', 'me', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'this', 'that', 'these', 'those', 'with', 'from', 'by', 'about',
    'ke', 'ka', 'ki', 'ko', 'se', 'me', 'hai', 'hain', 'tha', 'the',
    'kya', 'mera', 'meri', 'mere', 'aap', 'hum', 'aur', 'ya', 'par'
  ]);

  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ── Domain detector ───────────────────────────────────────────────────────────
/**
 * Detect which domains are relevant to the question.
 * Returns array of matching trigger configs.
 *
 * @param {string} question
 * @returns {Array}
 */
function detectDomains(question) {
  const lower = question.toLowerCase();
  return DOMAIN_TRIGGERS.filter(trigger =>
    trigger.keywords.some(kw => lower.includes(kw))
  );
}

// ── Context formatter ─────────────────────────────────────────────────────────
/**
 * Format retrieved documents into a readable context string.
 *
 * @param {Object[]} docs - array of database records
 * @param {string}   domain - domain label for section header
 * @returns {string}
 */
function formatDocs(docs, domain) {
  if (!docs || docs.length === 0) return '';

  const lines = [`\n--- ${domain.toUpperCase()} KNOWLEDGE ---`];

  docs.forEach(doc => {
    lines.push(`\n[${doc.title || doc.id}]`);
    if (doc.description) lines.push(doc.description);
    if (doc.metadata) {
      // Flatten key metadata fields
      const meta = doc.metadata;
      if (meta.symptoms)           lines.push(`Symptoms: ${meta.symptoms}`);
      if (meta.organicTreatment)   lines.push(`Organic Treatment: ${meta.organicTreatment}`);
      if (meta.chemicalTreatment)  lines.push(`Chemical Treatment: ${meta.chemicalTreatment}`);
      if (meta.preventiveMeasures) lines.push(`Prevention: ${meta.preventiveMeasures}`);
      if (meta.fertilizerAdvisory) lines.push(`Fertilizer: ${meta.fertilizerAdvisory}`);
      if (meta.recommendedCrops)   lines.push(`Recommended Crops: ${meta.recommendedCrops.join(', ')}`);
      if (meta.region)             lines.push(`Region: ${meta.region}`);
      if (meta.crop)               lines.push(`Crop: ${meta.crop}`);
      if (meta.severity)           lines.push(`Severity: ${meta.severity}`);
      if (meta.eligibility)        lines.push(`Eligibility: ${meta.eligibility}`);
      if (meta.benefit)            lines.push(`Benefit: ${meta.benefit}`);
      if (meta.distance)           lines.push(`Distance: ${meta.distance}`);
    }
  });

  return lines.join('\n');
}

// ── Main RAG function ─────────────────────────────────────────────────────────
/**
 * Given a farmer's question, retrieve and format relevant context from the
 * local JSON database. Does NOT call Gemma — returns context string only.
 *
 * @param {string} question
 * @param {Object} [options]
 * @param {string} [options.language='en'] - 'en' | 'hi' | 'gu' | 'mr' | 'pa'
 * @returns {Promise<{context: string, domains: string[], docCount: number}>}
 */
async function retrieveContext(question, options = {}) {
  const { language = 'en' } = options;

  if (!question || typeof question !== 'string') {
    return { context: '', domains: [], docCount: 0 };
  }

  const keywords       = extractKeywords(question);
  const searchQuery    = keywords.join(' ') || question;
  const matchedTriggers = detectDomains(question);

  // If no specific domain detected, search all domains broadly
  const triggers = matchedTriggers.length > 0
    ? matchedTriggers
    : DOMAIN_TRIGGERS.slice(0, 4); // fallback: first 4 domains

  const contextParts   = [];
  const domainsUsed    = [];
  let   totalDocCount  = 0;

  for (const trigger of triggers) {
    try {
      const docs = trigger.fn(searchQuery);
      if (docs.length > 0) {
        contextParts.push(formatDocs(docs, trigger.domains[0]));
        domainsUsed.push(trigger.domains[0]);
        totalDocCount += docs.length;
      }
    } catch (err) {
      // Never fail because of a single domain search error
      console.warn(`[RAG] Search failed for domain ${trigger.domains[0]}: ${err.message}`);
    }
  }

  const languageInstruction = buildLanguageInstruction(language);

  const context = contextParts.length > 0
    ? `${languageInstruction}\n\nKNOWLEDGE BASE CONTEXT:\n${contextParts.join('\n')}`
    : `${languageInstruction}\n\nNo specific context found. Answer from general agricultural knowledge.`;

  return {
    context,
    domains:  domainsUsed,
    docCount: totalDocCount,
    keywords
  };
}

// ── Language instruction builder ──────────────────────────────────────────────
/**
 * Build a language-specific instruction prefix for Gemma.
 * @param {string} language
 * @returns {string}
 */
function buildLanguageInstruction(language) {
  const instructions = {
    en: 'You are KrishiMitra AI, a helpful agricultural assistant for Indian farmers. Answer in simple English.',
    hi: 'Aap KrishiMitra AI hain, ek sahayak krishi sahayak. Kripaya saral Hindi mein jawab dein.',
    gu: 'Tame KrishiMitra AI chho, ek krushi sahayak. Gujarati bhashama jawab apo.',
    mr: 'Tumi KrishiMitra AI ahat, ek sheti sahayak. Marathi madhye uttara dya.',
    pa: 'Tusi KrishiMitra AI ho, ik kheti sahayak. Punjabi vich jawab deo.'
  };
  return instructions[language] || instructions.en;
}

// ── Build full Gemma prompt ────────────────────────────────────────────────────
/**
 * Compose a complete prompt for Gemma using the question + retrieved context.
 *
 * @param {string} question
 * @param {string} context - output from retrieveContext()
 * @returns {string}
 */
function buildPrompt(question, context) {
  return `${context}

FARMER'S QUESTION:
${question}

INSTRUCTIONS:
- Answer in simple, practical language a farmer can understand.
- Be specific with quantities (kg/acre, ml/litre, etc.).
- If you mention a treatment, specify whether it is organic or chemical.
- Keep the answer concise (under 200 words).
- Do not make up information that is not in the context.

ANSWER:`;
}

module.exports = {
  retrieveContext,
  buildPrompt,
  extractKeywords,
  detectDomains
};
