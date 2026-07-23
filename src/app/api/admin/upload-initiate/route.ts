import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';
import { UploadInitiateResponse } from '@/types';
import { validateAdminUploadMetadata } from '@/lib/admin-upload-validation';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isMegaUpload = !!session.user.isSuperAdmin;
    const expiresIn = isMegaUpload ? 21600 : 3600; // 6 hours vs 1 hour
    let validated;
    try {
      validated = validateAdminUploadMetadata(await req.json(), isMegaUpload);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid upload metadata.' },
        { status: 400 },
      );
    }

    // Generate a presigned upload URL from Cloudflare R2
    const signedUrl = await getPresignedUploadUrl(
      validated.storagePath,
      validated.contentType,
      expiresIn,
    );
    const publicUrl = getPublicUrl(validated.storagePath);

    const response: UploadInitiateResponse = {
      signedUrl,
      path: validated.storagePath,
      publicUrl,
      contentType: validated.contentType
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('Upload initiate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
