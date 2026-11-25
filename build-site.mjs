import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'dist');
const requiredVariables = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'GEOAPIFY_API_KEY'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length) {
  throw new Error(`Missing deployment configuration: ${missingVariables.join(', ')}`);
}

function getSiteUrl() {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL);

  const [owner, repository] = (process.env.GITHUB_REPOSITORY || '').split('/');
  if (!owner || !repository) {
    throw new Error('Set SITE_URL or run this build from a GitHub Actions repository.');
  }

  const isUserOrOrganizationSite = repository.toLowerCase() === `${owner}.github.io`.toLowerCase();
  return new URL(isUserOrOrganizationSite ? `https://${owner}.github.io/` : `https://${owner}.github.io/${repository}/`);
}

const siteUrl = getSiteUrl();
if (siteUrl.protocol !== 'https:' || siteUrl.search || siteUrl.hash) {
  throw new Error('The deployment URL must be an HTTPS URL without a query string or fragment.');
}
siteUrl.pathname = `${siteUrl.pathname.replace(/\/+$/, '')}/`;
const canonicalUrl = siteUrl.href;

const htmlPath = path.join(root, 'index.html');
const sourceHtml = await readFile(htmlPath, 'utf8');
const marker = '<!-- SEO metadata is completed with the public URL during deployment. -->';
if (!sourceHtml.includes(marker)) {
  throw new Error('Could not find the deployment SEO marker in index.html.');
}

const description = 'CMB-HalaBala ศูนย์ประสานงานช่วยเหลือน้ำท่วม แจ้งเหตุ ขอความช่วยเหลือ และติดตามสถานการณ์อุทกภัยในพื้นที่';
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CMB-HalaBala',
  alternateName: ['CMB', 'Hala-Bala', 'ศูนย์ประสานงานช่วยเหลือน้ำท่วม'],
  url: canonicalUrl,
  description,
  inLanguage: 'th-TH',
};
const seoMarkup = [
  `<link rel="canonical" href="${canonicalUrl}" />`,
  '<meta property="og:type" content="website" />',
  '<meta property="og:locale" content="th_TH" />',
  '<meta property="og:site_name" content="CMB-HalaBala" />',
  '<meta property="og:title" content="CMB-HalaBala | ศูนย์ประสานงานช่วยเหลือน้ำท่วม" />',
  `<meta property="og:description" content="${description}" />`,
  `<meta property="og:url" content="${canonicalUrl}" />`,
  '<meta name="twitter:card" content="summary" />',
  `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`,
].join('\n    ');

const html = sourceHtml.replace(marker, seoMarkup);
const configFiles = {
  'supabase-config.js': `window.CMB_SUPABASE_CONFIG = ${JSON.stringify({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  })};\n`,
  'geoapify-config.js': `window.CMB_GEOAPIFY_CONFIG = ${JSON.stringify({
    apiKey: process.env.GEOAPIFY_API_KEY,
  })};\n`,
};

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await cp(path.join(root, 'styles.css'), path.join(output, 'styles.css'));
for (const entry of ['styles', 'scripts', 'assets', 'node_modules']) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}

await writeFile(path.join(output, 'index.html'), html);
for (const [fileName, contents] of Object.entries(configFiles)) {
  await writeFile(path.join(output, fileName), contents);
}
await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${canonicalUrl}sitemap.xml\n`);
await writeFile(
  path.join(output, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${canonicalUrl}</loc></url>\n</urlset>\n`,
);

console.log(`Built GitHub Pages site for ${canonicalUrl}`);
