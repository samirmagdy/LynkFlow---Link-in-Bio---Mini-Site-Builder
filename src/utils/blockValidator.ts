/**
 * Block Schema Validation & Input Sanitization Engine
 * Satisfies BLK-001, BLK-003, and abuse prevention requirements.
 */

import { BlockType } from '../types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * Validates a destination URL against permitted schemes (https:, http:, mailto:, tel:)
 * Rejects javascript:, data:, and malformed inputs.
 */
export function validateUrl(rawUrl: string, allowRelative = false): ValidationResult {
  if (!rawUrl || !rawUrl.trim()) {
    return { isValid: false, error: 'URL cannot be empty.' };
  }

  const trimmed = rawUrl.trim();

  // Explicitly block malicious protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.includes('<script')
  ) {
    return { isValid: false, error: 'Unsafe URL scheme detected. Only HTTP, HTTPS, mailto, and tel are permitted.' };
  }

  // Handle mailto and tel schemes
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) {
    return { isValid: true, sanitizedValue: trimmed };
  }

  // Allow relative URLs if explicitly opted in
  if (allowRelative && trimmed.startsWith('/')) {
    return { isValid: true, sanitizedValue: trimmed };
  }

  // Validate HTTP/HTTPS URLs
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol.' };
    }
    return { isValid: true, sanitizedValue: parsed.toString() };
  } catch {
    return { isValid: false, error: 'Invalid URL format. Please provide a valid web address.' };
  }
}

/**
 * Transforms external media URLs (YouTube, Vimeo, Spotify) into safe embed URLs.
 * Also returns fallback metadata if unrecognized.
 */
export function sanitizeMediaEmbed(rawUrl: string): { embedUrl: string; provider: 'youtube' | 'vimeo' | 'spotify' | 'generic'; isValid: boolean } {
  if (!rawUrl) return { embedUrl: '', provider: 'generic', isValid: false };

  const trimmed = rawUrl.trim();

  // YouTube matchers
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      provider: 'youtube',
      isValid: true
    };
  }

  // Vimeo matchers
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`,
      provider: 'vimeo',
      isValid: true
    };
  }

  // Spotify matchers
  const spotifyMatch = trimmed.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i);
  if (spotifyMatch && spotifyMatch[1] && spotifyMatch[2]) {
    return {
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`,
      provider: 'spotify',
      isValid: true
    };
  }

  // Generic fallback if it's already an embed or valid https url
  const urlCheck = validateUrl(trimmed);
  return {
    embedUrl: urlCheck.isValid ? (urlCheck.sanitizedValue || trimmed) : '',
    provider: 'generic',
    isValid: urlCheck.isValid
  };
}

/**
 * Validates block payload against its expected schema
 */
export function validateBlockPayload(type: BlockType, payload: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Block payload must be an object.'] };
  }

  switch (type) {
    case 'link': {
      if (!payload.url) {
        errors.push('Link block requires a destination URL.');
      } else {
        const check = validateUrl(payload.url);
        if (!check.isValid) errors.push(`Link URL error: ${check.error}`);
      }
      break;
    }

    case 'media': {
      if (!payload.url) {
        errors.push('Media block requires an embed or image URL.');
      } else {
        const check = validateUrl(payload.url);
        if (!check.isValid) errors.push(`Media URL error: ${check.error}`);
      }
      break;
    }

    case 'gallery':
    case 'carousel': {
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        errors.push(`${type} block requires at least one image item.`);
      } else {
        payload.items.forEach((item: any, idx: number) => {
          if (!item.image) errors.push(`Image item #${idx + 1} requires an image URL.`);
          else if (!validateUrl(item.image).isValid) errors.push(`Image item #${idx + 1} has an invalid image URL.`);
          if (item.url && !validateUrl(item.url).isValid) errors.push(`Image item #${idx + 1} has an invalid link URL.`);
        });
      }
      break;
    }

    case 'product': {
      if (!payload.url) errors.push('Product block requires a destination URL.');
      else if (!validateUrl(payload.url).isValid) errors.push('Product destination URL is invalid.');
      if (payload.image && !validateUrl(payload.image).isValid) errors.push('Product image URL is invalid.');
      break;
    }

    case 'text': {
      if (payload.textType === 'p' || payload.textType === 'quote') {
        if (!payload.content || !payload.content.trim()) {
          errors.push('Paragraph or quote block requires content.');
        }
      }
      break;
    }

    case 'folder': {
      if (!Array.isArray(payload.items)) {
        errors.push('Folder block items must be an array.');
      } else {
        payload.items.forEach((item: any, idx: number) => {
          if (!item.title) errors.push(`Folder item #${idx + 1} requires a title.`);
          if (!item.url) errors.push(`Folder item #${idx + 1} requires a destination URL.`);
        });
      }
      break;
    }

    case 'faq': {
      if (!Array.isArray(payload.items)) {
        errors.push('FAQ block items must be an array.');
      } else {
        payload.items.forEach((item: any, idx: number) => {
          if (!item.question) errors.push(`FAQ item #${idx + 1} requires a question.`);
          if (!item.answer) errors.push(`FAQ item #${idx + 1} requires an answer.`);
        });
      }
      break;
    }

    case 'form':
    case 'emailSignup': {
      if (!Array.isArray(payload.fields) || payload.fields.length === 0) {
        errors.push('Form block requires at least one field.');
      }
      break;
    }

    case 'contact': {
      if (!payload.value || !payload.value.trim()) {
        errors.push('Contact block requires an email or phone number.');
      }
      break;
    }

    case 'file': {
      if (!payload.fileUrl) {
        errors.push('File block requires a download URL.');
      }
      break;
    }

    case 'testimonial': {
      if (!payload.quote || !payload.authorName) {
        errors.push('Testimonial requires both quote text and author name.');
      }
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
