import 'server-only';

import {
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getPrisma } from '@/lib/prisma';
import { batchDeleteR2Objects, getPublicUrl, getR2Client } from '@/lib/r2';
import { supabaseAdmin } from '@/lib/supabase';

export const R2_FREE_TIER_CAP_BYTES = 10_737_418_240;
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'qt', 'webm', 'm4v']);
const IMAGE_EXTENSIONS = new Set([
  'avif',
  'gif',
  'heic',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);

export type R2AssetCategory = 'VIDEO' | 'PDF' | 'IMAGE' | 'OTHER';

export interface R2StorageAsset {
  category: R2AssetCategory;
  contentType: string;
  key: string;
  lastModified: string | null;
  name: string;
  publicUrl: string;
  size: number;
}

export interface R2StorageSnapshot {
  documentBytes: number;
  fileCount: number;
  imageBytes: number;
  otherBytes: number;
  quotaBytes: number;
  recentAssets: R2StorageAsset[];
  totalBytes: number;
  usagePercent: number;
  videoBytes: number;
}

function getBucketName() {
  return (
    process.env.R2_BUCKET_NAME ??
    process.env.R2_BUCKET ??
    'eduportal-media'
  );
}

function extensionForKey(key: string) {
  const cleanKey = key.split('?')[0] ?? key;
  const extension = cleanKey.split('.').pop()?.toLowerCase();
  return extension && extension !== cleanKey ? extension : '';
}

export function classifyR2Asset(key: string): {
  category: R2AssetCategory;
  contentType: string;
} {
  const extension = extensionForKey(key);

  if (VIDEO_EXTENSIONS.has(extension)) {
    const videoTypes: Record<string, string> = {
      m4v: 'video/x-m4v',
      mov: 'video/quicktime',
      mp4: 'video/mp4',
      qt: 'video/quicktime',
      webm: 'video/webm',
    };
    return {
      category: 'VIDEO',
      contentType: videoTypes[extension] ?? 'video/*',
    };
  }

  if (extension === 'pdf') {
    return { category: 'PDF', contentType: 'application/pdf' };
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    const imageTypes: Record<string, string> = {
      avif: 'image/avif',
      gif: 'image/gif',
      heic: 'image/heic',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };
    return {
      category: 'IMAGE',
      contentType: imageTypes[extension] ?? 'image/*',
    };
  }

  return {
    category: 'OTHER',
    contentType: 'application/octet-stream',
  };
}

function assertSafeR2Key(key: string) {
  if (
    !key ||
    key.length > 1024 ||
    key.startsWith('/') ||
    key.includes('..') ||
    key.includes('//') ||
    /[\u0000-\u001f\u007f]/.test(key)
  ) {
    throw new Error('Invalid R2 object key.');
  }
}

export async function getR2StorageSnapshot(
  recentLimit = 50,
): Promise<R2StorageSnapshot> {
  const assets: R2StorageAsset[] = [];
  let continuationToken: string | undefined;
  let totalBytes = 0;
  let fileCount = 0;
  let videoBytes = 0;
  let documentBytes = 0;
  let imageBytes = 0;
  let otherBytes = 0;

  do {
    const response = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: getBucketName(),
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key) continue;
      const size = object.Size ?? 0;
      const { category, contentType } = classifyR2Asset(object.Key);
      const name = object.Key.split('/').pop() || object.Key;

      fileCount += 1;
      totalBytes += size;
      if (category === 'VIDEO') videoBytes += size;
      else if (category === 'PDF') documentBytes += size;
      else if (category === 'IMAGE') imageBytes += size;
      else otherBytes += size;

      assets.push({
        category,
        contentType,
        key: object.Key,
        lastModified: object.LastModified?.toISOString() ?? null,
        name,
        publicUrl: getPublicUrl(object.Key),
        size,
      });
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  const quotaBytes = R2_FREE_TIER_CAP_BYTES;
  const recentAssetCandidates = assets
    .sort((left, right) => {
      const rightTime = right.lastModified
        ? new Date(right.lastModified).getTime()
        : 0;
      const leftTime = left.lastModified
        ? new Date(left.lastModified).getTime()
        : 0;
      return rightTime - leftTime || left.key.localeCompare(right.key);
    })
    .slice(0, Math.max(0, Math.min(recentLimit, 100)));
  const recentAssets: R2StorageAsset[] = [];

  for (let index = 0; index < recentAssetCandidates.length; index += 10) {
    const batch = recentAssetCandidates.slice(index, index + 10);
    const enriched = await Promise.all(
      batch.map(async (asset) => {
        try {
          const metadata = await getR2Client().send(
            new HeadObjectCommand({
              Bucket: getBucketName(),
              Key: asset.key,
            }),
          );
          return {
            ...asset,
            contentType: metadata.ContentType || asset.contentType,
          };
        } catch {
          return asset;
        }
      }),
    );
    recentAssets.push(...enriched);
  }

  return {
    documentBytes,
    fileCount,
    imageBytes,
    otherBytes,
    quotaBytes,
    recentAssets,
    totalBytes,
    usagePercent: (totalBytes / quotaBytes) * 100,
    videoBytes,
  };
}

export async function deleteR2AssetAndReferences(key: string) {
  assertSafeR2Key(key);
  await getR2Client().send(
    new HeadObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );

  return deleteR2AssetsAndReferences([key]);
}

export async function deleteR2AssetsAndReferences(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys));
  if (!uniqueKeys.length || uniqueKeys.length > 100) {
    throw new Error('Choose between 1 and 100 R2 object keys.');
  }
  uniqueKeys.forEach(assertSafeR2Key);
  const publicUrls = uniqueKeys.map(getPublicUrl);

  await batchDeleteR2Objects(uniqueKeys);

  const prisma = getPrisma();
  const prismaRemovedReferences = await prisma.$transaction(async (transaction) => {
    let count = 0;
    for (const publicUrl of publicUrls) {
      for (const field of [
        'videoUrl',
        'videoUrl360',
        'videoUrl480',
        'videoUrl720',
        'videoUrl1080',
        'pdfUrl',
      ] as const) {
        const result = await transaction.lesson.updateMany({
          where: { [field]: publicUrl },
          data: { [field]: null },
        });
        count += result.count;
      }
    }
    const [courseImages, profileAvatars, materials, submissions] = await Promise.all([
      transaction.course.updateMany({
        where: { imageUrl: { in: publicUrls } },
        data: { imageUrl: null },
      }),
      transaction.user.updateMany({
        where: { avatarUrl: { in: publicUrls } },
        data: { avatarUrl: null },
      }),
      transaction.courseMaterial.deleteMany({
        where: { objectKey: { in: uniqueKeys } },
      }),
      transaction.assignmentSubmission.deleteMany({
        where: { objectKey: { in: uniqueKeys } },
      }),
    ]);
    return count + courseImages.count + profileAvatars.count + materials.count + submissions.count;
  });
  const legacyResult = await supabaseAdmin
    .from('content_items')
    .delete()
    .in('url', publicUrls)
    .select('id');

  if (legacyResult.error) {
    throw new Error(
      `R2 object was deleted, but legacy content cleanup failed: ${legacyResult.error.message}`,
    );
  }

  return {
    deletedKey: uniqueKeys.length === 1 ? uniqueKeys[0] : null,
    deletedKeys: uniqueKeys,
    removedReferences:
      prismaRemovedReferences + (legacyResult.data?.length ?? 0),
  };
}
