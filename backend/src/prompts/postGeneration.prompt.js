/**
 * AI LinkedIn Content Generation Prompts
 * Implements prompts for generating three distinct post approaches:
 * 1. News Update (What happened & why it matters)
 * 2. Industry Analysis (Implications & broader industry impact)
 * 3. Professional Opinion (Insightful discussion based on verified facts)
 */

export const LINKEDIN_GENERATION_SYSTEM_PROMPT = `You are a world-class LinkedIn editorial strategist and executive ghostwriter.
Your task is to transform verified news and deep research into high-impact, professional LinkedIn posts that earn genuine engagement and respectful discussion from senior professionals.

CRITICAL CONTENT RULES:
1. PROFESSIONAL TONE: Use simple, crisp, authoritative professional language. Never sound robotic or pompous.
2. NO TECHNICAL JARGON: Avoid unnecessary jargon, buzzwords, or convoluted phrasing. Speak clearly to intelligent decision-makers.
3. NO GENERIC CLICHÉS: Strictly avoid generic motivational slogans, hustle culture tropes, and filler ("In today's fast-paced world", "Let that sink in", "Thoughts?", "Agree?").
4. NO EXAGGERATED CLAIMS: Do not use hyperbolic clickbait ("Mind-blowing", "Insane revolution", "This changes everything forever").
5. DO NOT REPEAT VERBATIM: Synthesize and contextualize; do not copy sentences directly from the source article.
6. NO FABRICATED PERSONAL EXPERIENCES: Never invent personal anecdotes ("I was speaking with a client yesterday", "Over my 15 years in tech..."). Write from an informed industry observer perspective.
7. DO NOT INVENT OPINIONS: Base all analysis strictly on confirmed facts and objective implications. Frame discussion angles thoughtfully rather than inventing unverified beliefs.
8. PRESERVE FACTUAL ACCURACY: Strictly honor confirmed vs. uncertain claims. Never treat speculation or rumors as verified facts. Quote accurate numbers and dates.
9. RESTRAINED FORMATTING: Avoid excessive emojis (use at most 1-2 per post, or none). Keep hashtags to 3 to 5 relevant, focused tags.
10. SCANNABLE STRUCTURE: Use generous whitespace, short 1-2 sentence paragraphs, and clear bullet points for effortless mobile reading.

APPROACH DEFINITIONS:
1. "news_update": Focus on breaking down exactly what happened, the confirmed key facts, and why it matters right now to the industry.
2. "industry_analysis": Focus on structural implications, downstream ripple effects, strategic winners/losers, and long-term industry transformation.
3. "professional_opinion": Focus on thought-provoking strategic tradeoffs, open questions, and inviting high-caliber peer debate anchored strictly in the evidence.

You must respond ONLY with a valid JSON object matching the requested schema. No markdown formatting outside the JSON, no intro text.`;

/**
 * Build user prompt for generating all three post approaches simultaneously
 */
export const buildThreeApproachesUserPrompt = ({
  article,
  research = null,
  topic = null,
  targetAudience = 'Industry professionals and decision makers',
  contentAngle = '',
  preferredStyle = 'authoritative'
}) => {
  const researchData = research || article.deepResearch || {};
  const confirmedFacts = Array.isArray(researchData.confirmedClaims) && researchData.confirmedClaims.length > 0
    ? researchData.confirmedClaims
    : (Array.isArray(researchData.keyFacts) ? researchData.keyFacts : (article.keyFacts || []));

  const uncertainFacts = Array.isArray(researchData.uncertainClaims) ? researchData.uncertainClaims : [];
  const numbers = Array.isArray(researchData.importantNumbers) ? researchData.importantNumbers : [];
  const entities = Array.isArray(researchData.entities) ? researchData.entities : (article.relevantEntities || []);
  const industryImpact = researchData.industryImpact || '';
  const sources = Array.isArray(researchData.sources) && researchData.sources.length > 0
    ? researchData.sources
    : [{ title: article.title, publisher: article.publisher, url: article.sourceUrl }];

  return `Please generate three distinct LinkedIn post variations based on the following verified news story and research:

=== STORY CONTEXT ===
Headline: ${article.title}
Publisher: ${article.publisher || 'Unknown'}
Published Date: ${article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : 'Recent'}
Source URL: ${article.sourceUrl || ''}
Summary: ${article.summary || ''}
Topic: ${topic?.name || article.category || 'General'} (Category: ${topic?.category || 'Technology'})

=== VERIFIED DEEP RESEARCH ===
Main Event: ${researchData.mainEvent || article.title}
Research Summary: ${researchData.summary || article.summary}

Confirmed Facts:
${confirmedFacts.map((fact, i) => `${i + 1}. ${typeof fact === 'string' ? fact : fact.claim || JSON.stringify(fact)}`).join('\n') || 'None recorded'}

Important Numbers / Metrics:
${numbers.map(num => `- ${typeof num === 'string' ? num : `${num.metric || num.value}: ${num.context || ''}`}`).join('\n') || 'None'}

Key Entities (Companies/People):
${entities.map(e => (typeof e === 'string' ? e : e.name)).join(', ') || 'None'}

${uncertainFacts.length > 0 ? `Uncertain / Unconfirmed Aspects (DO NOT treat as facts):\n${uncertainFacts.map(u => `- ${typeof u === 'string' ? u : u.claim}`).join('\n')}` : ''}

Broader Industry Impact:
${industryImpact || 'Significant industry developments underway.'}

Primary Sources:
${sources.map(s => `- ${s.publisher || 'Source'}: ${s.url || ''}`).join('\n')}

=== STRATEGY & AUDIENCE ===
Target Audience: ${targetAudience}
Selected Content Angle: ${contentAngle || 'Direct strategic significance'}
Preferred Style: ${preferredStyle}

=== GENERATION INSTRUCTIONS ===
Generate a JSON object with keys "newsUpdate", "industryAnalysis", and "professionalOpinion".
Each of the three keys must have:
{
  "approach": "news_update" | "industry_analysis" | "professional_opinion",
  "approachLabel": "News Update" | "Industry Analysis" | "Professional Opinion",
  "headline": "Crisp headline summarizing this angle",
  "hookOptions": [
    "Hook 1: Data-driven or metric-focused opener (1-2 lines, under 140 chars)",
    "Hook 2: Curiosity or contrarian question opener (1-2 lines, under 140 chars)",
    "Hook 3: Direct impact or bold observation opener (1-2 lines, under 140 chars)"
  ],
  "content": "Full complete LinkedIn post body formatted with readable spacing and bullet points. (Between 150 and 350 words). Do not include the hook here if you want it modular, but make sure the post flows naturally with any of the 3 hooks.",
  "keyTakeaways": [
    "Crisp bullet point 1",
    "Crisp bullet point 2",
    "Crisp bullet point 3"
  ],
  "closingQuestion": "A thoughtful, conversation-sparking closing question for the comments",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4"],
  "sourceAttribution": "Source: ${article.publisher || 'Verified Reporting'} (${article.sourceUrl || ''})",
  "suggestedImageConcept": "A specific description of a chart, infographic, or photo that would accompany this post"
}

Ensure strictly valid JSON output matching this structure.`;
};

/**
 * Build prompt for regenerating 3 new hooks for a specific approach
 */
export const buildRegenerateHooksPrompt = ({
  approach,
  article,
  currentPostContent,
  targetAudience,
  contentAngle
}) => {
  return {
    system: LINKEDIN_GENERATION_SYSTEM_PROMPT,
    user: `For the following LinkedIn post (${approach}), generate 3 brand new, distinct opening hooks.
    
Story: "${article.title}"
Target Audience: ${targetAudience}
Content Angle: ${contentAngle || 'Standard'}

Current Post Content:
${currentPostContent}

Generate 3 high-converting hook options:
1. Curiosity / Counter-intuitive hook
2. Metric / Hard numbers hook
3. Direct question / Strategic challenge hook

Return strictly a JSON object:
{
  "approach": "${approach}",
  "hookOptions": [
    "New Hook Option 1",
    "New Hook Option 2",
    "New Hook Option 3"
  ]
}`
  };
};

/**
 * Build prompt for regenerating a single post approach with modified angle or style
 */
export const buildRegenerateSingleApproachPrompt = ({
  approach,
  article,
  research = null,
  topic = null,
  targetAudience,
  contentAngle,
  preferredStyle
}) => {
  const researchData = research || article.deepResearch || {};
  const confirmedFacts = Array.isArray(researchData.confirmedClaims) && researchData.confirmedClaims.length > 0
    ? researchData.confirmedClaims
    : (article.keyFacts || []);

  return {
    system: LINKEDIN_GENERATION_SYSTEM_PROMPT,
    user: `Regenerate the single LinkedIn post approach for: "${approach}".

Story: ${article.title}
Publisher: ${article.publisher || 'Unknown'}
Source: ${article.sourceUrl || ''}
Verified Facts:
${confirmedFacts.map((f, i) => `${i + 1}. ${typeof f === 'string' ? f : f.claim || JSON.stringify(f)}`).join('\n')}

Target Audience: ${targetAudience}
Angle: ${contentAngle}
Preferred Style: ${preferredStyle}

Return strictly a JSON object with this structure:
{
  "approach": "${approach}",
  "approachLabel": "${approach === 'news_update' ? 'News Update' : approach === 'industry_analysis' ? 'Industry Analysis' : 'Professional Opinion'}",
  "headline": "Crisp headline",
  "hookOptions": [
    "Hook 1",
    "Hook 2",
    "Hook 3"
  ],
  "content": "Full post body formatted cleanly with line breaks",
  "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
  "closingQuestion": "Discussion prompt",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
  "sourceAttribution": "Source: ${article.publisher || 'Verified Reporting'}",
  "suggestedImageConcept": "Visual concept brief"
}`
  };
};

export default {
  LINKEDIN_GENERATION_SYSTEM_PROMPT,
  buildThreeApproachesUserPrompt,
  buildRegenerateHooksPrompt,
  buildRegenerateSingleApproachPrompt
};
