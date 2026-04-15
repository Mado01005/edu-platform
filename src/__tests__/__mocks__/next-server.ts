// Mock for next/server
export class NextResponse extends Response {
  static json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        ...init?.headers,
        'Content-Type': 'application/json',
      },
    });
  }

  static redirect(url: string | URL, status?: number) {
    return new Response(null, {
      status: status || 307,
      headers: { Location: url.toString() },
    });
  }

  static next() {
    return new Response(null, { status: 200 });
  }
}

export class NextRequest extends Request {
  nextUrl: URL;
  constructor(input: string | URL, init?: RequestInit) {
    super(input, init);
    this.nextUrl = new URL(input.toString());
  }
}
