import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../src/context/AppContext';
import { PublicProfileView } from '../src/components/preview/PublicProfileView';
import { PhoneMockup } from '../src/components/preview/PhoneMockup';
import { INITIAL_PROFILES } from '../src/data/mockData';
import { SPEC_THEME_PRESETS } from '../src/data/themePresets';
import { IMPORTED_THEME_PRESETS } from '../src/data/importedThemePresets';
import { LIINKS_GALLERY_THEMES } from '../src/data/liinksGalleryThemes';
import { PERSONA_TEMPLATES } from '../src/data/personaTemplates';
import { normalizeTheme, compileThemeToCssVariables } from '../src/utils/themeEngine';
import type { Profile } from '../src/types';

const baseProfile = INITIAL_PROFILES[0];
const representativeThemes = Array.from(new Map([
  ...SPEC_THEME_PRESETS,
  ...IMPORTED_THEME_PRESETS,
  ...LIINKS_GALLERY_THEMES,
  ...PERSONA_TEMPLATES.map(persona => persona.theme),
].map(theme => [theme.id, theme])).values());
const failures: string[] = [];

const renderProfile = (theme: ReturnType<typeof normalizeTheme>, locale: 'en' | 'ar') => {
  const profile = {
    ...baseProfile,
    standardTheme: normalizeTheme({ ...theme, language: locale, direction: locale === 'ar' ? 'rtl' : 'ltr' }),
    displayName: locale === 'ar' ? 'سمير مجدي — Samir Magdy' : baseProfile.displayName,
    bio: locale === 'ar' ? 'مصمم ومصور مستقل يعمل مع علامات تجارية عربية وعالمية — Independent visual creator.' : baseProfile.bio,
    tabs: baseProfile.tabs.map(tab => ({
      ...tab,
      title: locale === 'ar' ? 'الأعمال المميزة' : tab.title,
      blocks: tab.blocks.map(block => ({ ...block, title: locale === 'ar' ? `رابط ${block.title}` : block.title }))
    }))
  } as Profile;

  return renderToStaticMarkup(
    <AppProvider lightweight>
      <PublicProfileView profile={profile} />
    </AppProvider>
  );
};

for (const sourceTheme of representativeThemes) {
  const theme = normalizeTheme(sourceTheme);
  const variables = compileThemeToCssVariables(theme);
  for (const locale of ['en', 'ar'] as const) {
    const html = renderProfile(theme, locale);
    const label = `${theme.id}/${locale}`;
    if (!html.includes(`data-profile-theme="${theme.id}"`)) failures.push(`${label}: missing theme marker`);
    if (!html.includes(`lang="${locale}"`)) failures.push(`${label}: missing locale marker`);
    if (!html.includes(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`)) failures.push(`${label}: missing direction marker`);
    if (!html.includes('profile-theme-root')) failures.push(`${label}: missing shared renderer root`);
    if (html.includes('No content published in this tab yet.')) failures.push(`${label}: fallback empty state rendered for populated content`);
    if (!html.includes(variables['--theme-body-font'])) failures.push(`${label}: resolved typography token missing from render`);
    if (locale === 'ar' && !html.includes(variables['--theme-arabic-font'])) failures.push(`${label}: Arabic typography token missing from RTL render`);
    if (!html.includes('data-image-placement=')) failures.push(`${label}: layout metadata missing from render`);
    if (!html.includes('max-width')) failures.push(`${label}: responsive/layout CSS missing from render`);
  }
}

const arabicPreview = renderToStaticMarkup(
  <AppProvider lightweight>
    <PhoneMockup
      hideControls
      previewSourceOverride="draft"
      previewLocaleOverride="ar"
      profileOverride={{ ...baseProfile, standardTheme: normalizeTheme({ ...baseProfile.standardTheme, language: 'en', direction: 'ltr' }) }}
    />
  </AppProvider>
);
if (!arabicPreview.includes('سمير مجدي') || !arabicPreview.includes('dir="rtl"') || !arabicPreview.includes('مصمم ومبدع مستقل')) {
  failures.push('Arabic preview mode did not render mixed-language sample content and RTL direction');
}

console.log(`Theme render contract: ${representativeThemes.length} themes × 2 locales`);
if (failures.length) {
  failures.forEach(failure => console.error(`[render] ${failure}`));
  process.exit(1);
}
console.log('Theme render contract: all shared-renderer checks passed');
