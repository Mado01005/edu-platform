import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'eduportal-media';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ACCOUNT_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

/**
 * Generate a presigned PUT URL so the browser can upload directly to R2.
 * The URL expires in 1 hour.
 */
export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  return signedUrl;
}

/**
 * Delete a file from R2 (used when admin deletes content).
 */
export async function deleteR2Object(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  await r2Client.send(command);
}

/**
 * Construct the public CDN URL for an uploaded file.
 * Uses the R2.dev subdomain or a custom domain.
 */
export function getPublicUrl(key: string) {
  const publicBase = process.env.R2_PUBLIC_URL || '';
  return `${publicBase}/${key}`;
}
