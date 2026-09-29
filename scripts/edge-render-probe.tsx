import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server.edge';
import { PublicProfileView } from '../src/components/preview/PublicProfileView';
import { INITIAL_PROFILES } from '../src/data/mockData';

const html = renderToStaticMarkup(
  React.createElement(PublicProfileView, { profile: INITIAL_PROFILES[0] })
);

if (!html.includes('data-profile-theme=') || !html.includes('profile-theme-root')) {
  throw new Error('React profile renderer did not produce the expected profile root.');
}
console.log(`Edge React renderer probe passed (${html.length} bytes)`);
