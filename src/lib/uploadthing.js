import { UploadButton, UploadDropzone } from '@uploadthing/react';
import { getClerkToken } from './apiAuth.js';

export { UploadButton, UploadDropzone };

export async function getUploadThingAuthHeaders() {
  const token = await getClerkToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getUploadThingFileUrl(file) {
  return file?.ufsUrl || file?.url || file?.serverData?.ufsUrl || file?.serverData?.url || null;
}

export function getUploadThingFileKey(file) {
  return file?.key || file?.serverData?.key || null;
}
