export function getEffectiveRequestOrigin(request: Request) {
  try {
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

    if (!host || (protocol !== 'http' && protocol !== 'https')) {
      return null;
    }

    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');

  // Non-browser/server-to-server requests commonly omit Origin. Authentication
  // and route-level authorization still apply to them.
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestOrigin = getEffectiveRequestOrigin(request);

    return (
      requestOrigin !== null &&
      originUrl.origin === requestOrigin &&
      originUrl.pathname === '/' &&
      originUrl.search === '' &&
      originUrl.hash === '' &&
      originUrl.username === '' &&
      originUrl.password === ''
    );
  } catch {
    return false;
  }
}
