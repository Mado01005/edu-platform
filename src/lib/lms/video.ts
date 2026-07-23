import type { ContentType } from '@prisma/client';

function asUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getVideoEmbedUrl(
  rawUrl: string,
  contentType: ContentType,
) {
  const url = asUrl(rawUrl);

  if (!url || url.protocol !== 'https:') {
    return null;
  }

  if (contentType === 'YOUTUBE') {
    const host = url.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') ?? '';
      } else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0] ?? '')) {
          videoId = parts[1] ?? '';
        }
      }
    }

    return /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  }

  if (contentType === 'VIMEO') {
    const host = url.hostname.replace(/^www\./, '');

    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') {
      return null;
    }

    const videoId = url.pathname
      .split('/')
      .filter(Boolean)
      .find((part) => /^\d+$/.test(part));

    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
  }

  return null;
}
