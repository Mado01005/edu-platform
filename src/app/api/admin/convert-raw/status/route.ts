import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing CLOUDCONVERT_API_KEY' }, { status: 500 });

    const response = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch job status from CloudConvert' }, { status: response.status });
    }

    const job = await response.json();
    const status = job.data.status;

    if (status === 'error') {
      const convertTask = job.data.tasks.find((t: any) => t.name === 'convert-raw');
      const errorMessage = convertTask?.message || 'CloudConvert job failed';
      return NextResponse.json({ status: 'error', message: errorMessage });
    }

    if (status === 'finished') {
      const exportTask = job.data.tasks.find((t: any) => t.name === 'export-result');
      if (exportTask?.result?.files && exportTask.result.files.length > 0) {
        return NextResponse.json({
          status: 'finished',
          url: exportTask.result.files[0].url
        });
      }
    }

    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
