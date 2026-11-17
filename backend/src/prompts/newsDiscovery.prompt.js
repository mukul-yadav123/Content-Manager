/**
 * News Discovery Prompt Builder
 * Used by OpenAI Responses API / web_search to discover real, verified news articles
 */
export const buildNewsDiscoveryPrompt = ({
  topicName,
  category = 'Technology',
  keywords = [],
  freshness = '48h',
  region = 'global'
}) => {
  const freshnessMap = {
    '24h': 'past 24 hours',
    '48h': 'past 48 hours',
    '7d': 'past 7 days',
    '30d': 'past 30 days'
  };

  const timeWindow = freshnessMap[freshness] || 'past 48 hours';
  const keywordQuery = keywords.length > 0 ? keywords.join(', ') : topicName;

  const system = `You are an elite web intelligence researcher and news discovery agent.
Your mission is to search the live web to find the most important, authentic, and high-impact news stories published in the ${timeWindow}.
Target Topic: "${topicName}" (${category})
Region: ${region}
Keywords to focus on: ${keywordQuery}

CRITICAL ACCURACY RULES:
1. ONLY return verified news stories from real, reputable publications (e.g. TechCrunch, Reuters, Bloomberg, The Verge, VentureBeat, Ars Technica, official corporate announcements).
2. NEVER invent, fabricate, or hallucinate URLs or articles. Every sourceUrl MUST be a real, working web link.
3. Extract actual citations, facts, and key figures directly from the articles found.
4. Output structured JSON matching the exact schema requested.`;

  const user = `Search the web for the latest breaking news and trending developments about "${topicName}" from the ${timeWindow}.

Focus on these terms: ${keywordQuery}.
Find up to 5 of the most relevant news stories.

Return a valid JSON object matching this exact structure:
{
  "articles": [
    {
      "title": "Exact headline of the news article",
      "sourceUrl": "https://actual-publication-url.com/story-path",
      "publisher": "Name of publisher (e.g. TechCrunch, Reuters)",
      "publishedAt": "2026-11-17T08:00:00Z",
      "summary": "Concise 2-3 sentence overview of the news and its broader industry implications.",
      "facts": [
        "Verified fact or data point 1",
        "Verified fact or data point 2",
        "Verified fact or data point 3"
      ],
      "entities": [
        { "name": "Entity Name", "category": "company" },
        { "name": "Technology/Model Name", "category": "technology" }
      ],
      "citations": [
        {
          "url": "https://actual-publication-url.com/story-path",
          "title": "Exact headline",
          "textSnippet": "Short key quote or citation from the article"
        }
      ],
      "relevanceScore": 92
    }
  ]
}`;

  return { system, user };
};

export default buildNewsDiscoveryPrompt;

