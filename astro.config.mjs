import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://warid.web.id',
  base: '/',
  output: 'static',
  integrations: [tailwind(), icon(), mdx()],
});