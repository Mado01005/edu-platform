# Nodrek Learning Hub brand and support

The English name is **Nodrek Learning Hub** (short name **Nodrek**); the Arabic name is **نُدرك للتعليم المتكامل** (short name **نُدرك**).
The motto is **LEARN • GROW • ACHIEVE** / **نتعلم • ننمو • ننجز**.

`src/lib/siteConfig.ts` owns the public brand, metadata description, assets, copyright, and contacts. `src/config/site.ts` derives the LMS brand and contact values from it.

## Support

1. WhatsApp support: **+20 155 422 5979** (international dialing **00201554225979**), `https://wa.me/201554225979`.
2. Email: **Support@nodrekhub.com**.

Support inquiry notifications default to `Nodrek Support <Support@nodrekhub.com>`. An explicit server-side `SUPPORT_EMAIL_FROM` overrides that default. The sender domain must be verified in Resend and the support mailbox must accept incoming mail. Changing the displayed contact or default sender does not configure DNS or provision a mailbox. Inquiries remain stored if email dispatch is pending.

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

- `public/brand/nodrek-banner.jpeg` is the supplied Nodrek artwork, unchanged (1126 × 496).
- `public/brand/nodrek-emblem.png` is the transparent header emblem (512 × 512); `public/brand/nodrek-logo.png` is the square app icon (512 × 512), with matching 192- and 512-pixel PWA icons.
- The app icon was created with the built-in imagegen tool from the supplied artwork. Prompt: isolate the existing book, scholar, graduation cap, leaves, and gold star; preserve their design, proportions, colors, and shading; remove lettering and the lower diacritic; center on pale sage with safe margins, no additional objects, border, or corner clipping. The header emblem was edited from that icon with the built-in imagegen tool to remove the sage background and preserve transparent alpha. These are adaptations, not pixel-identical crops.
- Service-worker cache version 10 replaces cached legacy app icons.

## Compatibility boundaries

Website domains and social account URLs stay at their existing verified destinations until replacements are configured. Authentication cookies, saved language preferences, classroom coordination keys, payment event identifiers, synthetic parent account identifiers, and applied migrations retain their existing names so the rebrand does not invalidate sessions, duplicate accounts, or break integrations. These identifiers are not visible brand copy.
