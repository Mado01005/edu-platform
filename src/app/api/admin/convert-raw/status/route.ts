import { NextResponse } from 'next/server';
import { auth } from '@/auth';

type CloudConvertTask = {
  name?: unknown;
  message?: unknown;
  result?: { files?: { url?: unknown }[] };
};

type CloudConvertJobResponse = {
  data?: {
    status?: unknown;
    tasks?: unknown;
  };
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId || !/^[a-zA-Z0-9-]{1,100}$/.test(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID.' }, { status: 400 });
    }

    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RAW conversion is not configured.' },
        { status: 503 },
      );
    }

    const response = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch job status from CloudConvert' }, { status: response.status });
    }

    const job = (await response.json()) as CloudConvertJobResponse;
    const status = job.data?.status;
    const tasks = Array.isArray(job.data?.tasks)
      ? (job.data.tasks as CloudConvertTask[])
      : [];

    if (status === 'error') {
      const convertTask = tasks.find((task) => task.name === 'convert-raw');
      const errorMessage =
        typeof convertTask?.message === 'string'
          ? convertTask.message
          : 'CloudConvert job failed';
      return NextResponse.json({ status: 'error', message: errorMessage });
    }

    if (status === 'finished') {
      const exportTask = tasks.find((task) => task.name === 'export-result');
      const resultUrl = exportTask?.result?.files?.[0]?.url;
      if (typeof resultUrl === 'string') {
        return NextResponse.json({
          status: 'finished',
          url: resultUrl,
        });
      }
    }

    if (typeof status !== 'string') {
      return NextResponse.json(
        { error: 'The conversion provider returned an invalid status.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ status });
  } catch (error: unknown) {
    console.error('[CloudConvert] Unable to read conversion status:', error);
    return NextResponse.json(
      { error: 'Unable to read RAW conversion status.' },
      { status: 500 },
    );
  }
}
