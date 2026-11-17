/**
 * Writing Profile Analysis Prompt
 * Analyzes 5-10 writing samples using OpenAI to extract a detailed personal writing personality.
 */

export const PROFILE_ANALYSIS_SYSTEM_PROMPT = `You are a world-class linguistic profiler and executive editorial director.
Your objective is to perform a deep forensic stylistic analysis of writing samples provided by an author.
You will extract 12 distinct stylistic dimensions that characterize their authentic voice, vocabulary, pacing, and formatting habits.

Analyze the samples across:
1. Tone of Voice: Core personality and emotional resonance (e.g. authoritative, conversational, inquisitive, pragmatic).
2. Vocabulary Complexity: Simple, moderate, or advanced lexical density and word choice.
3. Sentence Length: Average word count per sentence and variation pattern (short, medium, varied).
4. Paragraph Length: Sentence count per paragraph and spacing style (single-line, short, medium, varied).
5. Opening Hook Patterns: Structural opening strategies (e.g. contrarian challenge, hard numbers, curiosity question, direct observation).
6. Storytelling Preferences: How the author introduces examples or personal anecdotes (e.g. observer perspective, operational case studies, first-person takeaways).
7. Use of Personal Opinions: Level (frequent, balanced, fact-anchored) and how stances are framed.
8. Emoji Frequency: None, minimal (at most 1), moderate (2-3), or expressive.
9. Hashtag Usage: None, minimal (1-2), or targeted (3-5), plus placement habits.
10. Formatting Habits: Preferred bullet styles ('•', '-', numbers), line spacing, and capitalized headers.
11. Common Expressions: Specific recurring idioms, transitions, or signature phrases used by the author.
12. Phrases to Avoid: Words or generic corporate/AI clichés conspicuously absent or disliked.

Respond ONLY with a valid JSON object matching the requested schema. No markdown wrappers outside the JSON, no intro text.`;

export const buildProfileAnalysisUserPrompt = ({
  samples = [],
  customInstructions = '',
  preferredStyle = 'authoritative'
}) => {
  return `Please analyze the following ${samples.length} writing sample(s) from this author and extract their complete personal writing profile.

=== AUTHOR'S PREFERRED STYLE DIRECTION ===
Style: ${preferredStyle}
${customInstructions ? `Custom Author Instructions:\n${customInstructions}\n` : ''}

=== WRITING SAMPLES (${samples.length} total) ===
${samples.map((s, idx) => `[SAMPLE ${idx + 1}]:\n${s.trim()}`).join('\n\n--------------------\n\n')}

=== OUTPUT JSON STRUCTURE ===
Return strictly a JSON object with this exact shape:
{
  "toneOfVoice": "Comprehensive description of their personal voice, attitude, and reader relationship.",
  "vocabularyComplexity": {
    "level": "simple" | "moderate" | "advanced",
    "description": "Specific assessment of lexical choice and jargon preference."
  },
  "sentenceLength": {
    "averageWords": 12,
    "style": "short" | "medium" | "varied"
  },
  "paragraphLength": {
    "averageSentences": 2,
    "style": "single-line" | "short" | "medium" | "varied"
  },
  "hookPatterns": [
    "Hook Pattern 1 description",
    "Hook Pattern 2 description",
    "Hook Pattern 3 description"
  ],
  "storytellingPreferences": "Description of storytelling approach and illustrative narrative structure.",
  "useOfPersonalOpinions": {
    "level": "frequent" | "balanced" | "fact-anchored",
    "style": "How opinions and claims are substantiated."
  },
  "emojiFrequency": "none" | "minimal" | "moderate" | "expressive",
  "hashtagUsage": {
    "frequency": "none" | "minimal" | "targeted",
    "preferredCount": 3,
    "notes": "Hashtag placement and type preference."
  },
  "formattingHabits": {
    "bulletStyle": "•" | "-" | "numbers",
    "paragraphSpacing": "airy" | "compact" | "standard",
    "useCapitalizedHeadings": false
  },
  "commonExpressions": [
    "Signature phrase 1",
    "Signature phrase 2",
    "Signature phrase 3"
  ],
  "phrasesToAvoid": [
    "game-changer",
    "in today's fast-paced world",
    "delve",
    "let that sink in",
    "synergy"
  ]
}`;
};

export default {
  PROFILE_ANALYSIS_SYSTEM_PROMPT,
  buildProfileAnalysisUserPrompt
};

