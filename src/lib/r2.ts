import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
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
  forcePathStyle: true,
});

/**
 * Generate a presigned PUT URL so the browser can upload directly to R2.
 * The URL expires in 1 hour by default.
 */
export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return signedUrl;
}


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
 * P1.3: Verify that a file actually exists in R2 before creating a DB record.
 * Returns the ContentLength if the object exists, null otherwise.
 */
export async function verifyR2ObjectExists(key: string): Promise<number | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    const response = await r2Client.send(command);
    return response.ContentLength ?? null;
  } catch {
    return null;
  }
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
 * P3.3: Uses batch DeleteObjectsCommand (up to 1000 keys per request).
 */
export async function deleteR2Folder(prefix: string) {
  if (!prefix) return;

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

        for (let i = 0; i < deleteKeys.length; i += 1000) {
          const batch = deleteKeys.slice(i, i + 1000);
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: {
              Objects: batch.map(key => ({ Key: key })),
              Quiet: true
            }
          });
          await r2Client.send(deleteCommand);
        }
      }
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }
}


export async function batchDeleteR2Objects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const command = new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: {
        Objects: batch.map(key => ({ Key: key })),
        Quiet: true
      }
    });
    await r2Client.send(command);
  }
}



 
export async function initiateMultipartUpload(key: string, contentType: string): Promise<string> {
  const command = new CreateMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const response = await r2Client.send(command);
  if (!response.UploadId) throw new Error('Failed to initiate multipart upload');
  return response.UploadId;
}

/**
 * Generate a presigned URL for a single multipart upload part.
 */
export async function getPresignedMultipartPartUrl(key: string, uploadId: string, partNumber: number, contentType: string, expiresIn: number = 3600): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: R2_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return signedUrl;
}

/**
 * Complete a multipart upload with the provided part ETags.
 */
export async function completeMultipartUpload(key: string, uploadId: string, parts: { ETag: string; PartNumber: number }[]): Promise<string> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map(p => ({ ETag: p.ETag, PartNumber: p.PartNumber })),
    },
  });
  const response = await r2Client.send(command);
  return getPublicUrl(key);
}


export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const command = new AbortMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    UploadId: uploadId,
  });
  await r2Client.send(command);
}
