import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';

function getAllowedRoots(): string[] {
  const roots = process.env.ALLOWED_FILE_ROOTS;
  if (roots) return roots.split(',').map((r) => r.trim()).filter(Boolean);
  return ['/Volumes'];
}

export function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return getAllowedRoots().some((root) => resolved === root || resolved.startsWith(`${root}/`));
}

export class PathNotAllowedError extends Error {
  constructor(targetPath: string) {
    super(`Path not allowed: ${targetPath}`);
    this.name = 'PathNotAllowedError';
  }
}

export interface VolumeInfo {
  name: string;
  path: string;
  type: 'local' | 'smb' | 'nfs';
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  created: string;
}

export async function discoverVolumes(): Promise<VolumeInfo[]> {
  const roots = await fs.readdir('/Volumes').catch(() => []);
  const volumes = roots.map((name) => {
    // Map "Macintosh HD" to root filesystem
    const volumePath = name === 'Macintosh HD' ? '/' : path.join('/Volumes', name);
    return {
      name: name === 'Macintosh HD' ? 'Local System' : name,
      path: volumePath,
      type: 'local' as const,
    };
  });
  return volumes;
}

export async function browseDirectory(targetPath: string): Promise<DirectoryEntry[]> {
  if (!isPathAllowed(targetPath)) throw new PathNotAllowedError(targetPath);
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const out: DirectoryEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(targetPath, entry.name);
    const stat = await fs.stat(fullPath);
    out.push({
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
      size: stat.size,
      modified: stat.mtime.toISOString(),
      created: stat.birthtime.toISOString(),
    });
  }
  return out.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory));
}

export async function getFileMetadata(filePath: string): Promise<{
  path: string;
  name: string;
  ext: string;
  size: number;
  hash: string;
  birthtime: string;
  mtime: string;
}> {
  if (!isPathAllowed(filePath)) throw new PathNotAllowedError(filePath);
  const stat = await fs.stat(filePath);
  const hash = await new Promise<string>((resolve, reject) => {
    const hasher = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hasher.update(chunk));
    stream.on('end', () => resolve(hasher.digest('hex')));
    stream.on('error', reject);
  });
  return {
    path: filePath,
    name: path.basename(filePath),
    ext: path.extname(filePath).toLowerCase(),
    size: stat.size,
    hash,
    birthtime: stat.birthtime.toISOString(),
    mtime: stat.mtime.toISOString(),
  };
}
