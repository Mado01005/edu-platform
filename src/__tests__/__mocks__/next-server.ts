// Mock for next/server
export class NextResponse extends Response {
  private readonly responseCookies = new Map<string, string>();

  cookies = {
    delete: (name: string) => {
      this.responseCookies.delete(name);
    },
    getAll: () =>
      Array.from(this.responseCookies, ([name, value]) => ({ name, value })),
    set: (
      nameOrCookie: string | { name: string; value: string },
      value?: string,
    ) => {
      if (typeof nameOrCookie === 'string') {
        this.responseCookies.set(nameOrCookie, value ?? '');
      } else {
        this.responseCookies.set(nameOrCookie.name, nameOrCookie.value);
      }
    },
  };

  static json(data: any, init?: ResponseInit) {
    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        ...init?.headers,
        'Content-Type': 'application/json',
      },
    });
  }

  static redirect(url: string | URL, status?: number) {
    return new NextResponse(null, {
      status: status || 307,
      headers: { Location: url.toString() },
    });
  }

  static next() {
    return new NextResponse(null, { status: 200 });
  }
}

export class NextRequest extends Request {
  nextUrl: URL;
  cookies: {
    get: (name: string) => { name: string; value: string } | undefined;
    getAll: () => { name: string; value: string }[];
    set: (name: string, value: string) => void;
  };

  constructor(input: string | URL, init?: RequestInit) {
    super(input, init);
    this.nextUrl = new URL(input.toString());
    const cookieValues = new Map(
      (this.headers.get('cookie') ?? '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const separator = part.indexOf('=');
          return separator < 0
            ? { name: part, value: '' }
            : {
                name: part.slice(0, separator),
                value: part.slice(separator + 1),
              };
        })
        .map(({ name, value }) => [name, value]),
    );

    const readCookies = () =>
      Array.from(cookieValues, ([name, value]) => ({ name, value }));

    this.cookies = {
      get: (name) => readCookies().find((cookie) => cookie.name === name),
      getAll: readCookies,
      set: (name, value) => {
        cookieValues.set(name, value);
      },
    };
  }
}
