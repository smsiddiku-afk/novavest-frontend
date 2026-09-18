import type React from 'react';

/**
 * Image helper utility for robust asset resolution and fallback handling.
 * Resolves images from the public root directory (/images/...) to guarantee
 * compatibility with Vite production builds and static hosting (e.g. Firebase Hosting).
 */

export const FALLBACK_ENERGY_IMAGES = {
  solar: '/images/apex-helios-solar.jpg',
  wind: '/images/novawind-facility.jpg',
  hydro: '/images/smart_turbine_plant_1788466039952.jpg',
  combo: '/images/bess_storage_facility_1788466008161.jpg',
  turbine: '/images/smart_turbine_plant_1788466039952.jpg',
  bess: '/images/vanguard-bess-storage.jpg',
  offshore: '/images/energy_hero_facility_1788465969350.jpg',
  grid: '/images/solar_ai_substation_1788465992131.jpg',
  default: '/images/apex-helios-solar.jpg',
};

// Aliases mapping historical or external image paths to verified local bundled assets
const IMAGE_ALIASES: Record<string, string> = {
  'aeolus-wind-farm.jpg': '/images/novawind-facility.jpg',
  'hydro-plant.jpg': '/images/smart_turbine_plant_1788466039952.jpg',
  'biomass-station.jpg': '/images/bess_storage_facility_1788466008161.jpg',
  'geothermal-plant.jpg': '/images/solar_ai_substation_1788465992131.jpg',
  'nuclear-fusion.jpg': '/images/vanguard-bess-storage.jpg',
  'novawind-facility.jpg': '/images/novawind-facility.jpg',
  'apex-helios-solar.jpg': '/images/apex-helios-solar.jpg',
};

/**
 * Normalizes any image path to an absolute root public path (e.g. /images/...).
 */
export function resolveImageSrc(
  rawSrc?: string | null,
  fallbackType: keyof typeof FALLBACK_ENERGY_IMAGES = 'default'
): string {
  if (!rawSrc || typeof rawSrc !== 'string' || !rawSrc.trim()) {
    return FALLBACK_ENERGY_IMAGES[fallbackType] || FALLBACK_ENERGY_IMAGES.default;
  }

  const trimmed = rawSrc.trim();

  // Check alias table
  for (const [aliasKey, targetPath] of Object.entries(IMAGE_ALIASES)) {
    if (trimmed.includes(aliasKey)) {
      return targetPath;
    }
  }

  // If it's already a full HTTPS URL, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If path references /src/assets/images/..., convert to /images/...
  if (trimmed.startsWith('/src/assets/images/')) {
    return trimmed.replace('/src/assets/images/', '/images/');
  }

  // If path references src/assets/images/..., convert to /images/...
  if (trimmed.startsWith('src/assets/images/')) {
    return '/' + trimmed.replace('src/assets/images/', 'images/');
  }

  // If it already starts with /images/ or /assets/, ensure leading slash
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `/${trimmed}`;
}

/**
 * Image onError handler to seamlessly substitute broken images with high-quality fallback URLs.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackType: keyof typeof FALLBACK_ENERGY_IMAGES = 'default'
) {
  const target = e.currentTarget;
  const attempts = Number(target.dataset.fallbackAttempts || 0);

  // Prevent infinite error loops
  if (attempts >= 2) {
    target.style.display = 'none';
    return;
  }

  target.dataset.fallbackAttempts = String(attempts + 1);

  const fallbackUrl = FALLBACK_ENERGY_IMAGES[fallbackType] || FALLBACK_ENERGY_IMAGES.default;
  if (target.src !== fallbackUrl) {
    target.src = fallbackUrl;
  } else {
    // Secondary fallback
    target.src = '/images/apex-helios-solar.jpg';
  }
}
