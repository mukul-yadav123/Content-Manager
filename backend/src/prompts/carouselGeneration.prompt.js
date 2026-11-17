/**
 * AI LinkedIn Carousel Prompt Builders
 * Generates high-impact, mobile-readable carousels using HTML/CSS slide architecture.
 */

export const THEME_DEFINITIONS = {
  modern_navy: {
    id: 'modern_navy',
    name: 'Modern Navy',
    description: 'Deep navy canvas with electric cyan and ice-blue accents',
    bg: '#0A1128',
    cardBg: '#132247',
    text: '#FFFFFF',
    accent: '#38BDF8',
    secondary: '#94A3B8'
  },
  minimal_light: {
    id: 'minimal_light',
    name: 'Minimal Light',
    description: 'Crisp editorial white canvas with dark slate typography and royal blue accents',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    text: '#0F172A',
    accent: '#2563EB',
    secondary: '#475569'
  },
  executive_slate: {
    id: 'executive_slate',
    name: 'Executive Slate',
    description: 'Charcoal slate background with warm gold and amber accents',
    bg: '#0F172A',
    cardBg: '#1E293B',
    text: '#F8FAFC',
    accent: '#F59E0B',
    secondary: '#94A3B8'
  },
  obsidian_purple: {
    id: 'obsidian_purple',
    name: 'Obsidian Purple',
    description: 'Deep violet obsidian background with neon violet accents',
    bg: '#090514',
    cardBg: '#180E2E',
    text: '#FAF5FF',
    accent: '#C084FC',
    secondary: '#A855F7'
  },
  emerald_growth: {
    id: 'emerald_growth',
    name: 'Emerald Growth',
    description: 'Rich dark evergreen canvas with luminous mint accents',
    bg: '#022018',
    cardBg: '#064E3B',
    text: '#F0FDF4',
    accent: '#34D399',
    secondary: '#6EE7B7'
  },
  sunset_ember: {
    id: 'sunset_ember',
    name: 'Sunset Ember',
    description: 'Dark carbon background with warm coral and ember accents',
    bg: '#181210',
    cardBg: '#2E1912',
    text: '#FFF7ED',
    accent: '#FB923C',
    secondary: '#FDBA74'
  }
};

/**
 * Builds the LLM prompt to generate a 5-7 slide carousel outline & slide contents
 */
export const buildCarouselOutlinePrompt = ({
  postTitle = '',
  postHook = '',
  postBody = '',
  keyTakeaways = [],
  researchSummary = '',
  topic = 'Technology & Strategy',
  targetAudience = 'Senior Tech Leaders and Executives',
  slideCount = 6,
  customInstructions = ''
}) => {
  const boundedSlideCount = Math.max(5, Math.min(7, slideCount || 6));

  const systemPrompt = `You are a world-class LinkedIn carousel copywriter, editorial director, and information designer.
Your mission is to distill a complex news story, deep research document, or LinkedIn post into an irresistible, visually structured ${boundedSlideCount}-slide carousel.

CRITICAL DESIGN & EDITORIAL RULES:
1. MOBILE-FIRST READABILITY: LinkedIn users read on mobile phones. Never generate dense walls of text. Keep headings under 12 words and body paragraphs under 35 words.
2. STRICT SLIDE STRUCTURE:
   - Slide 1 (Type: "hook_intro"): Strong opening hook. Must seize attention in 3 seconds. Include a punchy headline, curiosity-inducing subtitle, topic badge, and "Swipe ->" cue.
   - Slides 2 to ${boundedSlideCount - 2} (Type: "content_point"): Deep insights and breakdown. Each slide must explain ONE core concept with:
     * A clear, bold headline
     * A concise explanatory paragraph or punchy synthesis
     * 2-3 structured takeaway bullet points (brief, actionable)
     * An optional metric/stat callout if numbers exist in the research (e.g., value: "4.5x", label: "Inference Efficiency")
     * A visual concept description describing an icon or motif
   - Slide ${boundedSlideCount - 1} (Type: "key_takeaway"): The high-level synthesis ("The Bottom Line"). Explain what this means for the industry.
   - Slide ${boundedSlideCount} (Type: "closing_cta"): Closing thought, compelling conversation question to drive comments, and follow invitation.
3. TONE: Authoritative, clear, insightful, free of generic corporate fluff.
4. EXACT COUNT: You must output EXACTLY ${boundedSlideCount} slides numbered 1 to ${boundedSlideCount}.`;

  const userPrompt = `Generate a ${boundedSlideCount}-slide LinkedIn carousel based on the following verified material:

TOPIC: ${topic}
TARGET AUDIENCE: ${targetAudience}

POST TITLE / HEADLINE:
${postTitle}

OPENING HOOK:
${postHook}

POST BODY CONTENT:
${postBody}

${keyTakeaways && keyTakeaways.length > 0 ? `KEY TAKEAWAYS:\n${keyTakeaways.map((t) => `• ${t}`).join('\n')}` : ''}

${researchSummary ? `FACTUAL RESEARCH CONTEXT:\n${researchSummary}` : ''}

${customInstructions ? `CUSTOM CREATOR DIRECTIVES:\n${customInstructions}` : ''}

Return a strictly valid JSON object with this exact structure:
{
  "carouselTitle": "Catchy headline for the carousel",
  "topic": "${topic}",
  "slides": [
    {
      "slideNumber": 1,
      "slideType": "hook_intro",
      "categoryBadge": "TOPIC CATEGORY (UPPERCASE)",
      "heading": "Big bold hook headline",
      "subheading": "Curiosity inducing subtitle explaining what the reader will learn",
      "bodyText": "One punchy sentence setting up the core dilemma or breakthrough.",
      "bulletPoints": [],
      "statCallout": { "value": "", "label": "" },
      "visualConcept": "Brief visual motif description (e.g., glowing circuit node, modern server rack)",
      "iconName": "sparkles"
    },
    ...
    {
      "slideNumber": ${boundedSlideCount},
      "slideType": "closing_cta",
      "categoryBadge": "JOIN THE DISCUSSION",
      "heading": "Closing thought or punchline",
      "subheading": "What is your perspective on this shift?",
      "bodyText": "Drop your thoughts below. Follow for more strategic breakdowns.",
      "bulletPoints": [],
      "statCallout": { "value": "", "label": "" },
      "visualConcept": "Author connect badge and conversation speech bubble motif",
      "iconName": "users"
    }
  ]
}`;

  return { systemPrompt, userPrompt };
};

/**
 * Builds the LLM prompt to regenerate a single slide
 */
export const buildRegenerateSlidePrompt = ({
  carouselTitle = '',
  currentSlide = {},
  slideNumber = 1,
  totalSlides = 6,
  instructions = ''
}) => {
  const systemPrompt = `You are an expert LinkedIn carousel editor. Re-write the specified slide while keeping it cohesive with the carousel's overall theme and structure.
Keep text mobile-friendly, punchy, and impactful.`;

  const userPrompt = `Re-write Slide ${slideNumber} of ${totalSlides} for the carousel titled: "${carouselTitle}".

CURRENT SLIDE CONTENT:
- Slide Type: ${currentSlide.slideType || 'content_point'}
- Category Badge: ${currentSlide.categoryBadge || 'INSIGHT'}
- Heading: ${currentSlide.heading || ''}
- Subheading: ${currentSlide.subheading || ''}
- Body Text: ${currentSlide.bodyText || ''}
- Bullet Points: ${JSON.stringify(currentSlide.bulletPoints || [])}
- Stat Callout: ${JSON.stringify(currentSlide.statCallout || { value: '', label: '' })}

REGENERATION INSTRUCTIONS:
${instructions || 'Make the heading more compelling and the takeaway bullets crisper and punchier.'}

Return a valid JSON object matching the single slide format:
{
  "slideNumber": ${slideNumber},
  "slideType": "${currentSlide.slideType || 'content_point'}",
  "categoryBadge": "${currentSlide.categoryBadge || 'INSIGHT'}",
  "heading": "New compelling heading",
  "subheading": "New refined subheading",
  "bodyText": "Refined punchy body text",
  "bulletPoints": ["Takeaway 1", "Takeaway 2"],
  "statCallout": { "value": "", "label": "" },
  "visualConcept": "Visual description",
  "iconName": "sparkles"
}`;

  return { systemPrompt, userPrompt };
};

