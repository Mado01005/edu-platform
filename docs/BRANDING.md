# Nudrek Learning Hub brand and support

The English name is **Nudrek Learning Hub** (short name **Nudrek**); the Arabic name is **نُدرك للتعليم المتكامل** (short name **نُدرك**).
The motto is **LEARN • GROW • ACHIEVE** / **نتعلم • ننمو • ننجز**.

`src/lib/siteConfig.ts` owns the public brand, metadata description, assets, copyright, and contacts. `src/config/site.ts` derives the LMS brand and contact values from it.

## Support

1. WhatsApp support: **+20 155 422 5979** (international dialing **00201554225979**), `https://wa.me/201554225979`.
2. Email: **support@nudrek.com**.

Support inquiry notifications default to `Nudrek Support <support@nudrek.com>`. An explicit server-side `SUPPORT_EMAIL_FROM` overrides that default. The sender domain must be verified in Resend and the support mailbox must accept incoming mail. Changing the displayed contact or default sender does not configure DNS or provision a mailbox. Inquiries remain stored if email dispatch is pending.

All public WhatsApp links use the single support number in `src/lib/siteConfig.ts`.

## Palette

| Token | Color | Use |
| --- | --- | --- |
| Deep teal / base | `#052F26` | Headlines, wordmark, contrast canvas |
| Dark card / surface | `#093F33` | Dark cards and badges |
| Dark border | `#145B4A` | Dividers on teal surfaces |
| Champagne gold | `#D8A649` | Primary CTAs, stars and accents |
| Gold highlight | `#E8BE5F` | Hover and highlights |
| Gold glow | `rgba(216, 166, 73, 0.25)` | Subtle rings and borders |
| Sage canvas | `#EEF5F1` | Light page background |
| Mint card border | `#C2DCCE` | White-card outline |
| Sage accent | `#A7C2B1` | Light badges and vignettes |
| Deep sage | `#88A996` | Secondary sage details |
| Foliage emerald | `#13644E` | Leaf and progress accents |
| Footer ivory | `#E2ECE5` | Text on dark teal |

The hero blends `#E2EFE7` through `#EEF5F1` to `#F5F8F6`. White card surfaces remain `#FFFFFF`.

`src/app/globals.css` supplies CSS tokens and the emerald utility scale. `tailwind.config.ts` supplies matching brand aliases. English uses Inter; Arabic uses Cairo with RTL support.

## Artwork

- `public/brand/nudrek-rec.png` is a byte-for-byte copy of the supplied rectangular Nudrek artwork (1889 × 832), used in the hero and social previews without cropping.
- `public/brand/nudrek-round.png` is a byte-for-byte copy of the supplied circular badge (1254 × 1254), used in shared header, footer, and LMS emblem placements. Its original opaque black background is preserved.
- The navbar and footer clip the supplied badge inside circular wrappers with a subtle brand-gold ring and a 5% image scale to hide its black outer corners.
- `src/app/icon.png` (512 × 512), `src/app/apple-icon.png` (180 × 180), and the public PWA icons (192 and 512 pixels) are proportional resizes of the supplied circular badge with transparent pixels outside its gold border. `public/favicon.ico` contains 16-, 32-, and 48-pixel versions of that badge.
- Service-worker cache version 12 replaces cached app icons with the circular versions.
- Structured data names the service Nudrek Learning Hub and retains Nodrek and Nodrek Hub as alternate names. The live domain and support email remain unchanged.

## Compatibility boundaries

Website domains and social account URLs stay at their existing verified destinations until replacements are configured. Authentication cookies, saved language preferences, classroom coordination keys, payment event identifiers, synthetic parent account identifiers, and applied migrations retain their existing names so the rebrand does not invalidate sessions, duplicate accounts, or break integrations. These identifiers are not visible brand copy.
