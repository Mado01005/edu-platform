import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isValidR2Url } from '@/lib/validation';

type CloudConvertJobResponse = {
  data?: { id?: unknown };
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RAW conversion is not configured.' },
        { status: 503 },
      );
    }

    const body: unknown = await req.json();
    const url =
      body && typeof body === 'object' ? Reflect.get(body, 'url') : null;

    if (typeof url !== 'string' || !isValidR2Url(url)) {
      return NextResponse.json(
        { error: 'A valid R2 file URL is required.' },
        { status: 400 },
      );
    }

    // Create a CloudConvert Job using the provided Public URL
    const response = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-raw': {
            operation: 'import/url',
            url,
          },
          'convert-raw': {
            operation: 'convert',
            input: 'import-raw',
            output_format: 'webp',
            engine: 'imagemagick'
          },
          'export-result': {
            operation: 'export/url',
            input: 'convert-raw'
          }
        }
      })
    });

    if (!response.ok) {
      const providerError = await response.text();
      console.error('[CloudConvert] Job creation failed:', providerError);
      return NextResponse.json(
        { error: 'The conversion provider rejected this file.' },
        { status: 502 },
      );
    }

    const job = (await response.json()) as CloudConvertJobResponse;
    const jobId = job.data?.id;

    if (typeof jobId !== 'string' || !jobId) {
      return NextResponse.json(
        { error: 'The conversion provider returned an invalid job.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ jobId });
  } catch (error: unknown) {
    console.error('[CloudConvert] Unable to create conversion job:', error);
    return NextResponse.json(
      { error: 'Unable to start RAW conversion.' },
      { status: 500 },
    );
  }
}
