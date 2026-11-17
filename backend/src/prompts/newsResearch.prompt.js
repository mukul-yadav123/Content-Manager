/**
 * News Research Prompt Builder
 * Guides OpenAI web_search research to find recent, verified industry news and data points.
 */
export const buildNewsResearchPrompt = ({ topic, industry, daysBack = 7 }) => {
  return {
    system: `You are an elite industry intelligence researcher and trend analyst specializing in ${industry}.
Your goal is to discover the latest, most impactful news stories, announcements, and data points from the last ${daysBack} days.
Focus on verified insights, quantifiable data, executive opinions, and market implications.
Avoid shallow clickbait or unsubstantiated gossip.`,
    user: `Perform thorough research on the following topic: "${topic}".
Identify:
1. The primary news event, announcement, or trend.
2. Verified facts, figures, and key stakeholders involved.
3. Why this matters to professionals and business leaders.
4. Contrasting perspectives or counterpoints.
5. 3 potential conversation-starting angles suitable for a LinkedIn thought leadership post.`
  };
};

export default buildNewsResearchPrompt;

