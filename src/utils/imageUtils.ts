import type React from 'react';

/**
 * Image helper utility for robust asset resolution and fallback handling.
 * Resolves images from the public root directory (/images/...) to guarantee
 * compatibility with Vite production builds and static hosting (e.g. Firebase Hosting).
 */

export const FALLBACK_ENERGY_IMAGES = {
  solar: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  bess: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=800&q=80',
  turbine: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
  wind: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
};

/**
 * Normalizes any image path to an absolute root public path (e.g. /images/...).
 */
export function resolveImageSrc(rawSrc?: string, fallbackType: keyof typeof FALLBACK_ENERGY_IMAGES = 'default'): string {
  if (!rawSrc) {
    return FALLBACK_ENERGY_IMAGES[fallbackType] || FALLBACK_ENERGY_IMAGES.default;
  }

  // If it's already a full HTTPS URL, return as-is
  if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('data:')) {
    return rawSrc;
  }

  // If path references /src/assets/images/..., convert to /images/...
  if (rawSrc.startsWith('/src/assets/images/')) {
    return rawSrc.replace('/src/assets/images/', '/images/');
  }

  // If path references src/assets/images/..., convert to /images/...
  if (rawSrc.startsWith('src/assets/images/')) {
    return '/' + rawSrc.replace('src/assets/images/', 'images/');
  }

  // If it already starts with /images/ or /assets/, ensure leading slash
  if (rawSrc.startsWith('/')) {
    return rawSrc;
  }

  return `/${rawSrc}`;
}

/**
 * Image onError handler to seamlessly substitute broken images with high-quality fallback URLs.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackType: keyof typeof FALLBACK_ENERGY_IMAGES = 'default'
) {
  const target = e.currentTarget;
  const fallbackUrl = FALLBACK_ENERGY_IMAGES[fallbackType] || FALLBACK_ENERGY_IMAGES.default;
  if (target.src !== fallbackUrl) {
    target.src = fallbackUrl;
  }
}
