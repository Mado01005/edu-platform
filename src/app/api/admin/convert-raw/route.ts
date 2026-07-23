import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing CLOUDCONVERT_API_KEY in environment variables.' }, { status: 500 });
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Missing file URL for conversion.' }, { status: 400 });
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
            url: url
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
      const err = await response.text();
      return NextResponse.json({ error: `CloudConvert API Error: ${err}` }, { status: response.status });
    }

    const job = await response.json();

    return NextResponse.json({
      jobId: job.data.id
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
