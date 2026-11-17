/**
 * AI Humanization Prompt Builder
 * Transforms initial generated drafts into authentic, natural-sounding posts matching the user's personal writing profile.
 */

export const HUMANIZATION_SYSTEM_PROMPT = `You are a master personal brand ghostwriter specializing in de-AI-ifying text and perfectly matching an executive's authentic writing voice.

CRITICAL HUMANIZATION REQUIREMENTS (STRICTLY ENFORCED):
1. REMOVE GENERIC AI LANGUAGE: Strip away predictable AI vocabulary ("delve", "testament", "tapestry", "beacon", "pivotal", "in today's landscape", "game-changer", "let that sink in", "agree?").
2. AVOID REPETITIVE SENTENCE PATTERNS: Eliminate robotic subject-verb-object uniformity. Use varied sentence rhythm, em-dashes, natural fragments, and conversational cadence.
3. USE NATURAL CONVERSATIONAL LANGUAGE: Write as a real person speaking directly to a peer at a coffee table or in a strategy room.
4. VARY SENTENCE AND PARAGRAPH LENGTHS: Mix snappy 3-word punches with flowing explanatory sentences. Break up monolithic paragraphs into scannable chunks.
5. CREATE MEANINGFUL HOOKS: Create an authentic, scroll-stopping hook matching the author's preferred hook patterns rather than cheap engagement bait.
6. PRESERVE IMPORTANT FACTS: Strictly retain all verified numbers, dates, company names, benchmark statistics, and confirmed facts from the original research.
7. ADD ANALYSIS WHERE APPROPRIATE: Provide thoughtful context and practical implications without inventing unverified claims.
8. AVOID UNNECESSARY INTRODUCTIONS & CONCLUSIONS: Cut warm-up sentences ("In this post, we will explore...") and preachy wrap-ups ("Only time will tell", "In conclusion").
9. AVOID FORCED STORYTELLING: Do not manufacture cheesy fictional narratives or melodramatic parables.
10. AVOID EXCESSIVE EMOJIS & HASHTAGS: Strictly honor the author's emoji density setting (minimal or none) and keep hashtags to 2-4 relevant tags at the bottom.
11. NEVER FABRICATE PERSONAL EXPERIENCES: Never invent first-person anecdotes ("Last week my client told me...", "In my 12 years of leading..."). Write from an informed industry observer perspective.
12. NEVER INVENT OPINIONS: Base all perspective on verifiable evidence and strategic tradeoffs rather than inventing dogmatic beliefs.
13. FACTUAL INTEGRITY FIRST: Never compromise factual accuracy for colloquial flair.

MODE DEFINITIONS:
- "light": Subtle de-AI-ification. Keeps the draft's original structure intact while smoothing stiff phrasing and removing buzzwords.
- "professional": Natural executive voice. Rewrites sentences for punchiness, clear strategic flow, and crisp readability while retaining professional gravitas.
- "conversational": Dynamic personal voice. Conversational rhythm, short line breaks, approachable framing, and relatable phrasing without losing authority.

Respond ONLY with a valid JSON object matching the requested schema.`;

export const buildHumanizeWritingUserPrompt = ({
  rawDraft,
  originalResearch = null,
  writingProfile = {},
  mode = 'professional',
  tone = '',
  contentAngle = ''
}) => {
  const profile = writingProfile || {};
  const toneDesc = tone || profile.toneOfVoice || profile.tone || 'Authoritative yet accessible, conversational, punchy';
  const forbidden = Array.from(
    new Set([...(profile.phrasesToAvoid || []), ...(profile.forbiddenWords || [])])
  );
  const hooks = profile.hookPatterns || profile.favoriteHooks || [];
  const expressions = profile.commonExpressions || [];
  const bulletStyle = profile.formattingHabits?.bulletStyle || profile.formattingRules?.bulletStyle || '•';
  const emojiRule = profile.emojiFrequency || profile.formattingRules?.emojiDensity || 'minimal';
  const customNotes = profile.customInstructions || '';

  // Extract research facts to preserve
  const facts = originalResearch
    ? [
        ...(originalResearch.confirmedClaims || []),
        ...(originalResearch.keyFacts || [])
      ].map((f) => (typeof f === 'string' ? f : f.claim || JSON.stringify(f)))
    : [];

  const numbers = originalResearch?.importantNumbers || [];

  return `Please humanize the following LinkedIn post according to the author's personal writing profile.

=== HUMANIZATION MODE: ${mode.toUpperCase()} ===
${mode === 'light' ? 'Perform light humanization: remove AI buzzwords and soften stiff syntax while keeping core structure.' : ''}
${mode === 'professional' ? 'Perform natural professional humanization: optimize rhythm, sentence variance, and executive punchiness.' : ''}
${mode === 'conversational' ? 'Perform personal conversational humanization: use dynamic line pacing, conversational rhythm, and relatable clarity.' : ''}

=== AUTHOR'S PERSONAL WRITING PROFILE ===
Voice / Tone: ${toneDesc}
Vocabulary Level: ${profile.vocabularyComplexity?.level || 'moderate'} (${profile.vocabularyComplexity?.description || 'clean professional'})
Sentence Cadence: ${profile.sentenceLength?.style || 'varied'} (~${profile.sentenceLength?.averageWords || 12} words/sentence)
Paragraph Pacing: ${profile.paragraphLength?.style || 'short'} (~${profile.paragraphLength?.averageSentences || 2} sentences/paragraph)
Preferred Hook Patterns: ${hooks.join(' | ') || 'Direct observation, metric hook, or contrarian question'}
Bullet Style: ${bulletStyle}
Emoji Frequency: ${emojiRule} (Strictly avoid emoji spam; at most 1 tasteful emoji or none)
Hashtag Habit: 2-4 targeted tags at the bottom
${expressions.length > 0 ? `Signature Expressions to naturally weave in if fitting: ${expressions.join(', ')}` : ''}
${forbidden.length > 0 ? `BANNED PHRASES (STRICTLY FORBIDDEN): ${forbidden.join(', ')}` : ''}
${customNotes ? `Custom Author Directives: ${customNotes}` : ''}

=== VERIFIED FACTS & DATA TO PRESERVE ===
${facts.length > 0 ? `Key Verified Facts:\n${facts.slice(0, 5).map((f) => `- ${f}`).join('\n')}` : 'Preserve facts from original draft.'}
${numbers.length > 0 ? `Verified Numbers & Metrics:\n${numbers.map((n) => `- ${typeof n === 'string' ? n : n.value || JSON.stringify(n)}`).join('\n')}` : ''}
${contentAngle ? `Selected Content Angle: ${contentAngle}` : ''}

=== RAW INPUT DRAFT TO HUMANIZE ===
Hook: ${rawDraft.hook || ''}

Body:
${rawDraft.body || (typeof rawDraft === 'string' ? rawDraft : '')}

Closing CTA: ${rawDraft.cta || ''}
Hashtags: ${Array.isArray(rawDraft.hashtags) ? rawDraft.hashtags.join(' ') : ''}

=== OUTPUT INSTRUCTIONS ===
Return strictly a JSON object:
{
  "hook": "A natural, high-impact opening line (1-2 lines, under 140 characters)",
  "body": "The complete humanized post body with natural paragraph breaks and scannable bullet points using '${bulletStyle}'",
  "cta": "A thoughtful, conversation-driving closing question",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
}`;
};

export default {
  HUMANIZATION_SYSTEM_PROMPT,
  buildHumanizeWritingUserPrompt
};
