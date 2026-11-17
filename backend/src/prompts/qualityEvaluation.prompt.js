/**
 * Humanization Quality Evaluation Prompt Builder
 * Evaluates the humanized post across 7 dimensions of naturalness, profile consistency, and factual integrity.
 * Note: Never relies on AI detector scores as proof of human authorship.
 */

export const QUALITY_EVALUATION_SYSTEM_PROMPT = `You are a senior executive editor and linguistic quality auditor.
Your job is to objectively score a LinkedIn post across 7 editorial quality criteria.

CRITICAL EVALUATION GUIDELINES:
1. DO NOT USE AI DETECTOR SCORES: Never evaluate based on black-box AI detection or perplexity scores. Evaluate based on human readability, cadence, rhythm, vocabulary authenticity, and scannability.
2. CHECK FACTUAL CONSISTENCY: Verify whether numbers, dates, claims, and entity names match the verified research without distortion or hallucination.
3. DETECT GENERIC FILLER LANGUAGE: Scrutinize the text for corporate cliches, empty buzzwords, generic motivational fluff, or banned phrases.
4. CHECK WRITING PROFILE CONSISTENCY: Check whether the tone, sentence lengths, and formatting honor the author's specified profile.

Score each dimension from 0 to 100:
- naturalnessScore: 0-100 (conversational cadence, absence of robotic cadence)
- profileConsistencyScore: 0-100 (alignment with user's tone, formatting, and stylistic rules)
- clarityScore: 0-100 (crisp message, absence of convoluted phrasing)
- engagementPotentialScore: 0-100 (compelling hook, discussion-worthy closing question)
- relevanceScore: 0-100 (timeliness and professional value to the target audience)
- factualConsistencyScore: 0-100 (accuracy of facts, preserved numbers, no hallucinations)
- overallQualityScore: 0-100 (weighted aggregate score)

Return strictly a valid JSON object matching the requested schema.`;

export const buildQualityEvaluationUserPrompt = ({
  post = {},
  originalResearch = null,
  writingProfile = {}
}) => {
  const fullPostText = `${post.hook || ''}\n\n${post.body || ''}\n\n${post.cta || ''}`;
  const researchFacts = originalResearch
    ? [
        ...(originalResearch.confirmedClaims || []),
        ...(originalResearch.keyFacts || [])
      ].map((f) => (typeof f === 'string' ? f : f.claim || JSON.stringify(f)))
    : [];

  const forbidden = [
    ...(writingProfile?.phrasesToAvoid || []),
    ...(writingProfile?.forbiddenWords || [])
  ];

  return `Evaluate the quality of the following humanized LinkedIn post:

=== POST CONTENT ===
${fullPostText}

=== TARGET WRITING PROFILE ===
Tone: ${writingProfile?.toneOfVoice || writingProfile?.tone || 'Authoritative yet accessible'}
Forbidden Phrases: ${forbidden.join(', ') || 'Standard corporate buzzwords'}
Emoji Density: ${writingProfile?.emojiFrequency || 'minimal'}
Bullet Style: ${writingProfile?.formattingHabits?.bulletStyle || '•'}

=== VERIFIED RESEARCH BENCHMARK ===
Facts to honor:
${researchFacts.slice(0, 5).map((f) => `- ${f}`).join('\n') || 'None recorded'}

=== EVALUATION OUTPUT ===
Return strictly a JSON object:
{
  "naturalnessScore": 92,
  "profileConsistencyScore": 90,
  "clarityScore": 94,
  "engagementPotentialScore": 88,
  "relevanceScore": 91,
  "factualConsistencyScore": 95,
  "genericFillerDetected": [],
  "overallQualityScore": 92,
  "feedbackNotes": "Specific qualitative summary of linguistic strengths and editorial polish."
}`;
};

export default {
  QUALITY_EVALUATION_SYSTEM_PROMPT,
  buildQualityEvaluationUserPrompt
};

