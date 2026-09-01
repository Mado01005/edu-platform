export const SOCIAL_ICON_NAMES = [
  'tiktok',
  'snapchat',
  'x',
  'facebook',
] as const;

export type SocialIconName = (typeof SOCIAL_ICON_NAMES)[number];

export type SocialLink = Readonly<{
  name: string;
  url: string;
  icon: SocialIconName;
  ariaLabel: string;
}>;

export const SOCIAL_LINKS = [
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@oqool.academy',
    icon: 'tiktok',
    ariaLabel: 'Follow Oqool Academy on TikTok',
  },
  {
    name: 'Snapchat',
    url: 'https://www.snapchat.com/@oqoolacademy',
    icon: 'snapchat',
    ariaLabel: 'Follow Oqool Academy on Snapchat',
  },
  {
    name: 'X',
    url: 'https://x.com/oqool_academy',
    icon: 'x',
    ariaLabel: 'Follow Oqool Academy on X',
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61593221859109',
    icon: 'facebook',
    ariaLabel: 'Follow Oqool Academy on Facebook',
  },
] as const satisfies readonly SocialLink[];
