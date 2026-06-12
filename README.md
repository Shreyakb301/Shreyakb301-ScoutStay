This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Maps & geocoding (OpenStreetMap — no API key required)

The dashboard map and address autocomplete run entirely on free, open services. There is **no token, account, or `.env` setup**:

- **Map display:** [React Leaflet](https://react-leaflet.js.org/) rendering [OpenStreetMap](https://www.openstreetmap.org/) tiles (attribution shown on the map).
- **Geocoding & address search:** [Nominatim](https://nominatim.org/), OpenStreetMap's geocoder.

To stay within Nominatim's [usage policy](https://operations.osmfoundation.org/policies/nominatim/), the app debounces autocomplete input (500 ms), throttles all geocoding requests to at most ~1 per second, and caches every result in memory for the session so the same address is never requested twice. Nominatim is a shared community service — fine for development and light use; for production traffic you should self-host Nominatim or use a commercial OSM-based provider.

**Testing locally:** run `npm run dev`, open `/compare`, and type a real address (3+ characters) into a stay's Address field — suggestions appear after a short pause. Pick one, submit the form, and the dashboard's "Location intelligence" card shows numbered, color-coded markers; click a marker for the stay's score, platform, and nightly price. Stays whose address can't be placed are listed in a footnote under the map instead of failing the page.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
