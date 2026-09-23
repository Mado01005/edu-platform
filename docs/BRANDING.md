# Nodrek Learning Hub brand and support

The English name is **Nodrek Learning Hub** (short name **Nodrek**); the Arabic name is **نُدرك للتعليم المتكامل** (short name **نُدرك**).
The motto is **LEARN • GROW • ACHIEVE** / **نتعلم • ننمو • ننجز**.

`src/lib/siteConfig.ts` owns the public brand, metadata description, assets, copyright, and contacts. `src/config/site.ts` derives the LMS brand and contact values from it.

## Support

1. Saudi Arabia Support: **+966 59 689 9362**, WhatsApp `https://wa.me/966596899362`.
2. Egypt Support: **+20 155 422 5979** (international dialing **00201554225979**), WhatsApp `https://wa.me/201554225979`.
3. Email: **Support@nodrekhub.com**.

Support inquiry notifications default to `Nodrek Support <Support@nodrekhub.com>`. An explicit server-side `SUPPORT_EMAIL_FROM` overrides that default. The sender domain must be verified in Resend and the support mailbox must accept incoming mail. Changing the displayed contact or default sender does not configure DNS or provision a mailbox. Inquiries remain stored if email dispatch is pending.

`NEXT_PUBLIC_NODREK_WHATSAPP_NUMBER` can override the main conversion-button destination. The previous environment key remains accepted for compatibility; direct switchboard links always use the two configured support lines.

## Palette

| Token | Color | Use |
| --- | --- | --- |
| Forest / base | `#063A2F` | Main text, headers, contrast containers |
| Emerald / surface | `#0A4235` | Dark cards, surfaces, hover states |
| Gold | `#D8A84E` | CTAs, accents, stars |
| Gold highlight | `#E5C06E` | Gold hover and highlights |
| Sage | `#B2CDBC` | Light accents and borders |
| Backdrop | `#F4F7F4` | Page canvas |

`src/app/globals.css` supplies CSS tokens and the emerald utility scale. `tailwind.config.ts` supplies matching brand aliases. English uses Inter; Arabic uses Cairo with RTL support.

## Artwork

- `public/brand/nodrek-banner.jpeg` is the supplied Nodrek artwork, unchanged (1126 × 496).
- `public/brand/nodrek-logo.png` is a square icon adaptation (512 × 512), with matching 192- and 512-pixel PWA icons.
- The icon was created with the built-in imagegen tool from the supplied artwork. Prompt: isolate the existing book, scholar, graduation cap, leaves, and gold star; preserve their design, proportions, colors, and shading; remove lettering and the lower diacritic; center on pale sage with safe margins, no additional objects, border, or corner clipping. It is an adaptation, not a pixel-identical crop.
- Service-worker cache version 10 replaces cached legacy app icons.

## Compatibility boundaries

Website domains and social account URLs stay at their existing verified destinations until replacements are configured. Authentication cookies, saved language preferences, classroom coordination keys, payment event identifiers, synthetic parent account identifiers, and applied migrations retain their existing names so the rebrand does not invalidate sessions, duplicate accounts, or break integrations. These identifiers are not visible brand copy.
