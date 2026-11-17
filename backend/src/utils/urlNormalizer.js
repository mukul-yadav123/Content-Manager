/**
 * URL Normalizer Utility
 * Cleans tracking parameters, fragments, trailing slashes, and protocols
 * to guarantee robust duplicate prevention in MongoDB.
 */
export const normalizeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  try {
    const parsed = new URL(rawUrl.trim());

    // Tracking query params to strip
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'utm_id',
      'fbclid',
      'gclid',
      'msclkid',
      'ref',
      'source',
      'feature',
      'mc_cid',
      'mc_eid',
      '_hsenc',
      '_hsmi'
    ];

    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Remove hash/fragment
    parsed.hash = '';

    // Standardize protocol and hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Standardize pathname (remove trailing slash except for root)
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    // Sort query parameters deterministically
    parsed.searchParams.sort();

    return parsed.toString();
  } catch {
    // If not a valid parseable URL, return trimmed lowercase fallback
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
};

export default normalizeUrl;

