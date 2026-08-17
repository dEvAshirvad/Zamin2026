import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Buffer } from 'node:buffer';

import env from '@/configs/env';
import { withTimeout } from '@/lib/with-timeout';

interface PresignPutParams {
  key: string;
  contentType: string;
  contentLength: number;
}

interface PresignGetParams {
  key: string;
  downloadFileName?: string;
}

function s3TimeoutMs(): number {
  return env.S3_OPERATION_TIMEOUT_MS;
}

async function sendWithTimeout<T>(promise: Promise<T>): Promise<T> {
  return withTimeout(promise, s3TimeoutMs(), 'S3 operation timed out');
}

function readStorageConfig() {
  return {
    endpoint: env.MINIO_ENDPOINT?.trim(),
    publicEndpoint: env.MINIO_PUBLIC_ENDPOINT?.trim() || env.MINIO_ENDPOINT?.trim(),
    region: env.MINIO_REGION?.trim() || 'us-east-1',
    bucket: env.MINIO_BUCKET?.trim(),
    accessKeyId: env.MINIO_ACCESS_KEY_ID?.trim(),
    secretAccessKey: env.MINIO_SECRET_ACCESS_KEY?.trim(),
    forcePathStyle: env.MINIO_FORCE_PATH_STYLE,
    uploadExpiresIn: env.MINIO_PRESIGN_UPLOAD_EXPIRES_SECONDS,
    downloadExpiresIn: env.MINIO_PRESIGN_DOWNLOAD_EXPIRES_SECONDS,
  };
}

let storageClient: S3Client | null = null;
let publicStorageClient: S3Client | null = null;

function createStorageClient(endpoint: string): S3Client {
  const cfg = readStorageConfig();
  return new S3Client({
    endpoint: endpoint.replace(/\/+$/, ''),
    region: cfg.region,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId!,
      secretAccessKey: cfg.secretAccessKey!,
    },
  });
}

function getStorageClient(): S3Client {
  if (storageClient)
    return storageClient;

  const cfg = readStorageConfig();
  if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('MinIO storage is not fully configured');
  }

  storageClient = createStorageClient(cfg.endpoint);
  return storageClient;
}

function getPublicStorageClient(): S3Client {
  if (publicStorageClient)
    return publicStorageClient;

  const cfg = readStorageConfig();
  const endpoint = cfg.publicEndpoint;
  if (!endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('MinIO storage is not fully configured');
  }

  publicStorageClient = createStorageClient(endpoint);
  return publicStorageClient;
}

export function isS3Configured(): boolean {
  const cfg = readStorageConfig();
  return Boolean(
    cfg.endpoint
    && cfg.bucket
    && cfg.region
    && cfg.accessKeyId
    && cfg.secretAccessKey,
  );
}

export function assertS3Configured(): void {
  if (!isS3Configured()) {
    throw new Error('MinIO storage is not configured');
  }
}

export async function ensureStorageBucketExists(): Promise<void> {
  assertS3Configured();
  const cfg = readStorageConfig();
  const client = getStorageClient();

  try {
    await sendWithTimeout(client.send(new HeadBucketCommand({ Bucket: cfg.bucket })));
    return;
  }
  catch {
    // Bucket missing — create it (safe if multiple workers race)
  }

  try {
    await sendWithTimeout(client.send(new CreateBucketCommand({ Bucket: cfg.bucket })));
  }
  catch (error) {
    const errorName = error instanceof Error ? error.name : '';
    const alreadyExists = errorName === 'BucketAlreadyOwnedByYou'
      || errorName === 'BucketAlreadyExists';
    if (!alreadyExists) {
      throw error;
    }
  }

  await sendWithTimeout(client.send(new HeadBucketCommand({ Bucket: cfg.bucket })));
}

export async function presignPutObject(params: PresignPutParams): Promise<{
  uploadUrl: string;
  expiresInSeconds: number;
}> {
  assertS3Configured();
  const cfg = readStorageConfig();
  const client = getPublicStorageClient();
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: cfg.uploadExpiresIn,
  });
  return { uploadUrl, expiresInSeconds: cfg.uploadExpiresIn };
}

export async function presignGetObject(params: PresignGetParams): Promise<{
  downloadUrl: string;
  expiresInSeconds: number;
}> {
  assertS3Configured();
  const cfg = readStorageConfig();
  // Existence check on internal endpoint; sign with public so browsers can open the URL.
  const internal = getStorageClient();
  await sendWithTimeout(internal.send(new HeadObjectCommand({
    Bucket: cfg.bucket,
    Key: params.key,
  })));

  const getCommand = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: params.key,
    ResponseContentDisposition: params.downloadFileName
      ? `attachment; filename="${params.downloadFileName.replace(/"/g, '')}"`
      : undefined,
  });
  const downloadUrl = await getSignedUrl(getPublicStorageClient(), getCommand, {
    expiresIn: cfg.downloadExpiresIn,
  });
  return { downloadUrl, expiresInSeconds: cfg.downloadExpiresIn };
}

export async function headObject(key: string): Promise<{
  contentLength?: number;
  contentType?: string;
}> {
  assertS3Configured();
  const cfg = readStorageConfig();
  const client = getStorageClient();
  const response = await sendWithTimeout(client.send(
    new HeadObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  ));
  return {
    contentLength: response.ContentLength,
    contentType: response.ContentType,
  };
}

export async function deleteObject(key: string): Promise<void> {
  assertS3Configured();
  const cfg = readStorageConfig();
  const client = getStorageClient();
  await sendWithTimeout(client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  ));
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  assertS3Configured();
  const cfg = readStorageConfig();
  const client = getStorageClient();
  await sendWithTimeout(client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  ));
}

export async function getObjectText(key: string): Promise<string> {
  const buf = await getObjectBuffer(key);
  return buf.toString('utf-8');
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  assertS3Configured();
  const cfg = readStorageConfig();
  const client = getStorageClient();
  const response = await sendWithTimeout(client.send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  ));
  if (!response.Body) {
    throw new Error(`Object body is empty for key ${key}`);
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}
