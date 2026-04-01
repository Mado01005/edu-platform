import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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
 * Upload a raw buffer directly from the server.
 */
export async function putR2Object(key: string, body: Buffer | Uint8Array, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await r2Client.send(command);
  return getPublicUrl(key);
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
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '') || '';
  const cleanKey = key.replace(/^\/+/, '');
  return `${publicBase}/${cleanKey}`;
}

/**
 * List all objects currently in the R2 Bucket.
 * Handles pagination automatically.
 */
export async function listAllR2Objects(): Promise<string[]> {
  const keys: string[] = [];
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;

  while (isTruncated) {
    const command: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(command);
    
    if (response.Contents) {
      response.Contents.forEach((item) => {
        if (item.Key) keys.push(item.Key);
      });
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }

  return keys;
}

/**
 * Recursively delete a "folder" from R2 by listing and deleting all keys with the same prefix.
 */
export async function deleteR2Folder(prefix: string) {
  if (!prefix) return;
  
  // S3 prefix matching is exact. Ensure trailing slash if intended.
  // But here we'll just use the provided prefix (e.g. "Biology/Cell-Structure")
  
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;

  while (isTruncated) {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(listCommand);
    
    if (response.Contents && response.Contents.length > 0) {
      const deleteKeys = response.Contents
        .map(item => item.Key)
        .filter((key): key is string => !!key);

      if (deleteKeys.length > 0) {
        // Simple delete for each (batching is better but this is safer for R2 limits)
        for (const key of deleteKeys) {
          await deleteR2Object(key);
        }
      }
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }
}
