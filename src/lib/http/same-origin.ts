export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers
      .get('x-forwarded-host')
      ?.split(',')[0]
      ?.trim();
    const forwardedProto = request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim();
    const requestUrl = new URL(request.url);
    const host =
      forwardedHost ??
      request.headers.get('host') ??
      requestUrl.host;
    const protocol = forwardedProto ?? requestUrl.protocol.replace(':', '');

    return originUrl.host === host && originUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}
