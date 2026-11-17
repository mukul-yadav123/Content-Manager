/**
 * Writing Humanizer Prompt Builder
 * Rewrites AI draft content to mirror the user's personal voice, cadence, and stylistic profile.
 */
export const buildHumanizeWritingPrompt = ({
  rawDraft,
  writingProfile = {}
}) => {
  const {
    tone = 'authentic, conversational, direct',
    forbiddenWords = [],
    samplePosts = [],
    formattingPreferences = 'short paragraphs, 1-2 sentences per line, minimal emojis'
  } = writingProfile;

  return {
    system: `You are an expert personal brand ghostwriter specializing in voice matching and de-AI-ifying text.
Your task is to transform AI-generated drafts into content that reads unmistakably human, as if written by this specific author.

Author Guidelines:
- Tone of Voice: ${tone}
- Formatting Preferences: ${formattingPreferences}
- Forbidden Phrases / AI Clichés: ${forbiddenWords.length > 0 ? forbiddenWords.join(', ') : 'None specified (avoid typical corporate jargon)'}

${samplePosts.length > 0 ? `Author Voice Samples:\n${samplePosts.map((p, i) => `[Sample ${i + 1}]:\n${p}`).join('\n\n')}` : ''}

Rules:
1. Preserve all core facts and value from the original draft.
2. Alter rhythm, sentence variance, and natural colloquial transitions.
3. Completely strip any banned phrases or AI signature words.`,
    user: `Humanize the following LinkedIn draft to strictly adhere to the author's writing profile:\n\n${rawDraft}`
  };
};

export default buildHumanizeWritingPrompt;

