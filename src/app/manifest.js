export default function manifest() {
  return {
    name: 'Lucky Squares Australia',
    short_name: 'Lucky Squares',
    description: 'Run Lucky Squares fundraisers for your school, club, or charity.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF7F0',
    theme_color: '#6B46F5',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
