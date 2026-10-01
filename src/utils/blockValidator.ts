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

/** Validates an app/deep-link destination while rejecting executable schemes. */
export function validateAppUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || !rawUrl.trim()) return { isValid: false, error: 'App link cannot be empty.' };
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!match || /^(javascript|data|vbscript)$/i.test(match[1])) return { isValid: false, error: 'Use a valid app link such as spotify:// or instagram://.' };
  return { isValid: true, sanitizedValue: trimmed.slice(0, 2048) };
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
type PayloadRecord = Record<string, unknown>;

const isPayloadRecord = (value: unknown): value is PayloadRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const getString = (payload: PayloadRecord, key: string): string => typeof payload[key] === 'string' ? payload[key] as string : '';

export function validateBlockPayload(type: BlockType, payloadInput: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isPayloadRecord(payloadInput)) {
    return { isValid: false, errors: ['Block payload must be an object.'] };
  }
  const payload = payloadInput;

  switch (type) {
    case 'link': {
      const url = getString(payload, 'url');
      if (!url) {
        errors.push('Link block requires a destination URL.');
      } else {
        const check = validateUrl(url);
        if (!check.isValid) errors.push(`Link URL error: ${check.error}`);
      }
      const thumbnailUrl = getString(payload, 'thumbnailUrl');
      if (thumbnailUrl && !validateUrl(thumbnailUrl).isValid) errors.push('Link thumbnail URL is invalid.');
      const appUrl = getString(payload, 'appUrl');
      if (appUrl && !validateAppUrl(appUrl).isValid) errors.push('Link app destination is invalid.');
      break;
    }

    case 'media': {
      const url = getString(payload, 'url');
      if (!url) {
        errors.push('Media block requires an embed or image URL.');
      } else {
        const check = validateUrl(url);
        if (!check.isValid) errors.push(`Media URL error: ${check.error}`);
      }
      const poster = getString(payload, 'poster');
      const captionsUrl = getString(payload, 'captionsUrl');
      if (poster && !validateUrl(poster).isValid) errors.push('Media poster URL is invalid.');
      if (captionsUrl && !validateUrl(captionsUrl).isValid) errors.push('Media captions URL is invalid.');
      break;
    }

    case 'gallery':
    case 'carousel': {
      const items = payload.items;
      if (!Array.isArray(items) || items.length === 0) {
        errors.push(`${type} block requires at least one image item.`);
      } else {
        items.forEach((item, idx) => {
          if (!isPayloadRecord(item)) {
            errors.push(`Image item #${idx + 1} is invalid.`);
            return;
          }
          const image = getString(item, 'image');
          const url = getString(item, 'url');
          if (!image) errors.push(`Image item #${idx + 1} requires an image URL.`);
          else if (!validateUrl(image).isValid) errors.push(`Image item #${idx + 1} has an invalid image URL.`);
          if (url && !validateUrl(url).isValid) errors.push(`Image item #${idx + 1} has an invalid link URL.`);
        });
      }
      break;
    }

    case 'product':
    case 'course': {
      const url = getString(payload, 'url');
      const image = getString(payload, 'image');
      const deliveryUrl = getString(payload, 'deliveryUrl');
      const checkoutEnabled = payload.checkoutEnabled === true;
      if (type === 'course' && payload.physicalProduct === true) errors.push('Course blocks cannot be physical products.');
      if (!checkoutEnabled && !url) errors.push(`${type === 'course' ? 'Course' : 'Product'} block requires a destination URL.`);
      if (url && !validateUrl(url).isValid) errors.push(`${type === 'course' ? 'Course' : 'Product'} destination URL is invalid.`);
      if (image && !validateUrl(image).isValid) errors.push(`${type === 'course' ? 'Course' : 'Product'} image URL is invalid.`);
      if (deliveryUrl && !validateUrl(deliveryUrl).isValid) errors.push('Digital delivery URL is invalid.');
      if (type === 'course') {
        if (!Array.isArray(payload.lessons) || payload.lessons.length === 0) errors.push('Course block requires at least one lesson.');
        else payload.lessons.forEach((lesson, index) => {
          if (!isPayloadRecord(lesson) || !getString(lesson, 'title').trim()) errors.push(`Course lesson #${index + 1} requires a title.`);
          const contentUrl = isPayloadRecord(lesson) ? getString(lesson, 'contentUrl') : '';
          if (contentUrl && !validateUrl(contentUrl).isValid) errors.push(`Course lesson #${index + 1} has an invalid lesson link.`);
        });
      }
      if (checkoutEnabled) {
        const price = Number(getString(payload, 'price'));
        if (!Number.isFinite(price) || price <= 0) errors.push(`${type === 'course' ? 'Course' : 'Product'} checkout requires a valid positive price.`);
        if (!getString(payload, 'currency')) errors.push(`${type === 'course' ? 'Course' : 'Product'} checkout requires a currency.`);
        if (type === 'course' && !deliveryUrl) errors.push('Course checkout requires a course access link for delivery.');
      }
      break;
    }

    case 'tip': {
      const amount = Number(getString(payload, 'amount'));
      const currency = getString(payload, 'currency');
      if (!Number.isFinite(amount) || amount <= 0) errors.push('Tip block requires a valid positive amount.');
      if (!/^[A-Za-z]{3}$/.test(currency)) errors.push('Tip block requires a three-letter currency code.');
      break;
    }

    case 'membership': {
      const price = Number(getString(payload, 'price'));
      const currency = getString(payload, 'currency');
      const interval = getString(payload, 'interval');
      if (!Number.isFinite(price) || price <= 0) errors.push('Membership requires a valid positive price.');
      if (!/^[A-Za-z]{3}$/.test(currency)) errors.push('Membership requires a three-letter currency code.');
      if (!['month', 'year'].includes(interval)) errors.push('Membership requires a monthly or annual interval.');
      if (payload.checkoutEnabled !== true && !getString(payload, 'url')) errors.push('Membership requires secure checkout or a destination URL.');
      if (getString(payload, 'url') && !validateUrl(getString(payload, 'url')).isValid) errors.push('Membership destination URL is invalid.');
      if (getString(payload, 'deliveryUrl') && !validateUrl(getString(payload, 'deliveryUrl')).isValid) errors.push('Membership access link is invalid.');
      break;
    }

    case 'event': {
      const date = getString(payload, 'date');
      const url = getString(payload, 'url');
      if (!date) errors.push('Event block requires a date.');
      if (url && !validateUrl(url).isValid) errors.push('Event registration URL is invalid.');
      break;
    }

    case 'text': {
      const textType = getString(payload, 'textType');
      const content = getString(payload, 'content');
      if (textType === 'p' || textType === 'quote') {
        if (!content.trim()) {
          errors.push('Paragraph or quote block requires content.');
        }
      }
      break;
    }

    case 'folder': {
      const items = payload.items;
      if (!Array.isArray(items)) {
        errors.push('Folder block items must be an array.');
      } else {
        items.forEach((item, idx) => {
          if (!isPayloadRecord(item)) {
            errors.push(`Folder item #${idx + 1} is invalid.`);
            return;
          }
          const title = getString(item, 'title');
          const url = getString(item, 'url');
          if (!title) errors.push(`Folder item #${idx + 1} requires a title.`);
          if (!url) errors.push(`Folder item #${idx + 1} requires a destination URL.`);
          else if (!validateUrl(url).isValid) errors.push(`Folder item #${idx + 1} has an invalid destination URL.`);
        });
      }
      break;
    }

    case 'faq': {
      const items = payload.items;
      if (!Array.isArray(items)) {
        errors.push('FAQ block items must be an array.');
      } else {
        items.forEach((item, idx) => {
          if (!isPayloadRecord(item)) {
            errors.push(`FAQ item #${idx + 1} is invalid.`);
            return;
          }
          if (!getString(item, 'question')) errors.push(`FAQ item #${idx + 1} requires a question.`);
          if (!getString(item, 'answer')) errors.push(`FAQ item #${idx + 1} requires an answer.`);
        });
      }
      break;
    }

    case 'form':
    case 'emailSignup': {
      if (!Array.isArray(payload.fields) || payload.fields.length === 0) {
        errors.push('Form block requires at least one field.');
      }
      if (payload.formType === 'booking') {
        const fields = Array.isArray(payload.fields) ? payload.fields as Array<Record<string, unknown>> : [];
        if (!fields.some(field => field.type === 'email')) errors.push('Booking requests require an email field.');
        if (!fields.some(field => field.type === 'date')) errors.push('Booking requests require a preferred date field.');
      }
      break;
    }

    case 'contact': {
      const value = getString(payload, 'value');
      if (!value.trim()) {
        errors.push('Contact block requires an email or phone number.');
      } else {
        const contactType = getString(payload, 'contactType');
        const prefix = contactType === 'email' ? 'mailto:' : contactType === 'phone' ? 'tel:' : 'https://wa.me/';
        if (!validateUrl(`${prefix}${value}`).isValid) errors.push('Contact destination is invalid.');
      }
      break;
    }

    case 'file': {
      const fileUrl = getString(payload, 'fileUrl');
      if (!fileUrl) {
        errors.push('File block requires a download URL.');
      } else if (!validateUrl(fileUrl).isValid) {
        errors.push('File download URL is invalid.');
      }
      break;
    }

    case 'testimonial': {
      if (!getString(payload, 'quote') || !getString(payload, 'authorName')) {
        errors.push('Testimonial requires both quote text and author name.');
      }
      break;
    }

    default:
      errors.push('Unsupported block type.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
