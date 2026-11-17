import logger from '../../utils/logger.js';

/**
 * Edit Learning Service
 * Analyzes differences between AI/humanized drafts and user-edited/approved versions.
 * Formulates non-destructive profile suggestions without silently modifying user settings.
 */

/**
 * Compare an original version against a user-edited or approved version
 */
export const extractEditDeltas = ({ original = {}, edited = {} }) => {
  const origHook = (original.hook || '').trim();
  const editHook = (edited.hook || '').trim();

  const origBody = (original.body || '').trim();
  const editBody = (edited.body || '').trim();

  const origCta = (original.cta || '').trim();
  const editCta = (edited.cta || '').trim();

  const deltas = [];

  // 1. Hook Length Delta
  if (origHook && editHook && editHook !== origHook) {
    if (editHook.length < origHook.length * 0.65) {
      deltas.push({
        type: 'hook_length',
        detail: 'User significantly shortened the opening hook.',
        before: origHook,
        after: editHook
      });
    }
  }

  // 2. Emoji Removal Delta
  const origHasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(`${origHook} ${origBody}`);
  const editHasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(`${editHook} ${editBody}`);
  if (origHasEmoji && !editHasEmoji) {
    deltas.push({
      type: 'emoji_density',
      detail: 'User removed all emojis from the post.',
      before: 'Contained emojis',
      after: 'Zero emojis'
    });
  }

  // 3. Bullet Style Delta
  const origHasBullets = origBody.includes('•');
  const editHasDashBullets = editBody.includes('- ');
  if (origHasBullets && editHasDashBullets) {
    deltas.push({
      type: 'bullet_style',
      detail: 'User converted round bullet points (•) to dashes (-).',
      before: '• bullet style',
      after: '- dash style'
    });
  }

  // 4. Paragraph Spacing / Single-Line Pacing
  const origParas = origBody.split(/\n\s*\n/).length;
  const editParas = editBody.split(/\n\s*\n/).length;
  if (editParas >= origParas + 2) {
    deltas.push({
      type: 'paragraph_length',
      detail: 'User broke paragraphs into more airy, single-line spacing.',
      before: `${origParas} paragraphs`,
      after: `${editParas} paragraphs`
    });
  }

  // 5. Detected Removed Words (potential additions to forbidden words)
  const commonFluffWords = ['furthermore', 'moreover', 'crucial', 'notably', 'consequently', 'essentially'];
  for (const fluff of commonFluffWords) {
    const origRegex = new RegExp(`\\b${fluff}\\b`, 'i');
    const editRegex = new RegExp(`\\b${fluff}\\b`, 'i');
    if (origRegex.test(origBody) && !editRegex.test(editBody)) {
      deltas.push({
        type: 'forbidden_words',
        word: fluff,
        detail: `User explicitly deleted filler word "${fluff}".`,
        before: fluff,
        after: ''
      });
    }
  }

  return deltas;
};

/**
 * Process draft edit differences across recent drafts and synthesize suggestions
 */
export const synthesizeSuggestionsFromEdits = async ({ currentDraft, profile, recentApprovedDrafts = [] }) => {
  if (!profile) return [];

  // Determine comparison pair
  const original = currentDraft.humanizedDraft?.body
    ? currentDraft.humanizedDraft
    : currentDraft.initialDraft;

  const edited = currentDraft.finalApprovedDraft?.body
    ? currentDraft.finalApprovedDraft
    : (currentDraft.userEditedDraft?.body ? currentDraft.userEditedDraft : currentDraft);

  const currentDeltas = extractEditDeltas({ original, edited });

  // Check existing pending suggestions
  const existingPendingTypes = new Set(
    (profile.learnedSuggestions || [])
      .filter((s) => s.status === 'pending')
      .map((s) => s.ruleType)
  );

  const newSuggestions = [];

  // Evaluate Hook Length Pattern
  if (
    currentDeltas.some((d) => d.type === 'hook_length') &&
    !existingPendingTypes.has('hook_length')
  ) {
    const hookDelta = currentDeltas.find((d) => d.type === 'hook_length');
    newSuggestions.push({
      ruleType: 'hook_length',
      currentSetting: 'Standard hook length (~120 chars)',
      suggestedSetting: 'Ultra-punchy concise hooks (<70 chars)',
      rationale:
        'You repeatedly trim generated opening hooks down to concise, 1-line statements.',
      examples: [
        `Original: "${hookDelta.before.substring(0, 75)}..."`,
        `Your version: "${hookDelta.after}"`
      ],
      status: 'pending',
      detectedAt: new Date()
    });
  }

  // Evaluate Emoji Density Pattern
  if (
    currentDeltas.some((d) => d.type === 'emoji_density') &&
    profile.emojiFrequency !== 'none' &&
    !existingPendingTypes.has('emoji_density')
  ) {
    newSuggestions.push({
      ruleType: 'emoji_density',
      currentSetting: `Emoji frequency: ${profile.emojiFrequency || 'minimal'}`,
      suggestedSetting: 'Emoji frequency: none',
      rationale:
        'You stripped emojis from your recent drafts. Setting emoji frequency to "none" will keep posts clean by default.',
      examples: ['Stripped all emojis from body text.'],
      status: 'pending',
      detectedAt: new Date()
    });
  }

  // Evaluate Bullet Style Pattern
  if (
    currentDeltas.some((d) => d.type === 'bullet_style') &&
    !existingPendingTypes.has('bullet_style')
  ) {
    newSuggestions.push({
      ruleType: 'bullet_style',
      currentSetting: 'Bullet style: •',
      suggestedSetting: 'Bullet style: -',
      rationale:
        'You converted round bullets (•) to simple dashes (-).',
      examples: ['Replaced "•" with "-" in takeaway lists.'],
      status: 'pending',
      detectedAt: new Date()
    });
  }

  // Evaluate Forbidden Words Pattern
  const removedWords = currentDeltas
    .filter((d) => d.type === 'forbidden_words')
    .map((d) => d.word);

  for (const word of removedWords) {
    const existingForbidden = new Set([
      ...(profile.phrasesToAvoid || []),
      ...(profile.forbiddenWords || [])
    ]);
    if (!existingForbidden.has(word) && !existingPendingTypes.has('forbidden_words')) {
      newSuggestions.push({
        ruleType: 'forbidden_words',
        currentSetting: `Not in forbidden list`,
        suggestedSetting: `Add "${word}" to phrases to avoid`,
        rationale: `You deleted the word "${word}" during editing. Would you like to ban this word automatically?`,
        examples: [`Deleted "${word}" from generated copy.`],
        status: 'pending',
        detectedAt: new Date()
      });
      break; // Add one word at a time
    }
  }

  if (newSuggestions.length > 0) {
    profile.learnedSuggestions.push(...newSuggestions);
    await profile.save();
    logger.info(
      `Synthesized ${newSuggestions.length} non-destructive profile suggestions for user ${profile.userId}`
    );
  }

  return newSuggestions;
};

/**
 * Accept and apply a learned suggestion to the user profile
 */
export const applySuggestion = async ({ profile, suggestionId, action = 'accept' }) => {
  const suggestion = profile.learnedSuggestions.id(suggestionId);
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (action === 'dismiss') {
    suggestion.status = 'dismissed';
    await profile.save();
    return { applied: false, profile };
  }

  // Apply accepted recommendation
  if (suggestion.ruleType === 'hook_length') {
    if (!profile.hookPatterns.includes('Ultra-punchy single-line hook (<70 chars)')) {
      profile.hookPatterns.unshift('Ultra-punchy single-line hook (<70 chars)');
    }
  } else if (suggestion.ruleType === 'emoji_density') {
    profile.emojiFrequency = 'none';
    if (profile.formattingRules) {
      profile.formattingRules.emojiDensity = 'none';
    }
  } else if (suggestion.ruleType === 'bullet_style') {
    if (profile.formattingHabits) {
      profile.formattingHabits.bulletStyle = '-';
    }
    if (profile.formattingRules) {
      profile.formattingRules.bulletStyle = '-';
    }
  } else if (suggestion.ruleType === 'forbidden_words') {
    const match = suggestion.suggestedSetting.match(/"([^"]+)"/);
    const word = match ? match[1] : null;
    if (word && !profile.phrasesToAvoid.includes(word)) {
      profile.phrasesToAvoid.push(word);
      profile.forbiddenWords.push(word);
    }
  }

  suggestion.status = 'accepted';
  suggestion.appliedAt = new Date();

  await profile.save();
  return { applied: true, profile };
};

export default {
  extractEditDeltas,
  synthesizeSuggestionsFromEdits,
  applySuggestion
};

