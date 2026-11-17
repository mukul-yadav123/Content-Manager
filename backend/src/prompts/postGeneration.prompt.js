/**
 * LinkedIn Post Generation Prompt Builder
 * Generates viral, high-retention LinkedIn posts structured with hooks, body, and CTA.
 */
export const buildPostGenerationPrompt = ({
  topic,
  researchSummary,
  targetAudience = 'Industry professionals and decision makers',
  postFormat = 'standard', // 'standard' | 'story' | 'breakdown' | 'carousel'
  tone = 'authoritative yet approachable'
}) => {
  return {
    system: `You are a master LinkedIn ghostwriter who has generated millions of impressions for top industry founders.
Your writing is punchy, authentic, and delivers immediate value without fluff.
You avoid generic buzzwords (e.g., "game-changer", "thrilled to announce", "in today's fast-paced world").
Every post must have:
- A scroll-stopping hook (under 120 characters, compelling enough to make readers click "...see more").
- Scannable, spaced-out body text with clear takeaways or contrarian insights.
- A natural conversation-driving Call To Action (CTA).
- 3 to 5 targeted hashtags.`,
    user: `Draft a high-performing LinkedIn post about: "${topic}".
Target Audience: ${targetAudience}
Tone: ${tone}
Format: ${postFormat}

Verified Research & Data:
${researchSummary}

Output structured JSON containing:
{
  "hook": "Compelling single or double line opener",
  "body": "Formatted post body with line breaks and bullet points",
  "cta": "Engaging closing question or discussion prompt",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "carouselSlides": [
    { "slideNumber": 1, "title": "Slide Title", "content": "Slide summary" }
  ]
}`
  };
};

export default buildPostGenerationPrompt;

