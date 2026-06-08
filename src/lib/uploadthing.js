import { UploadButton, UploadDropzone } from '@uploadthing/react';

export { UploadButton, UploadDropzone };

export async function getUploadThingAuthHeaders() {
  try {
    const clerk = window.Clerk;
    const token = clerk?.session?.getToken ? await clerk.session.getToken() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[uploadthing] Unable to attach Clerk token', { message: error?.message || 'token lookup failed' });
    return {};
  }
}

export function getUploadThingFileUrl(file) {
  return file?.ufsUrl || file?.url || file?.serverData?.ufsUrl || file?.serverData?.url || null;
}

export function getUploadThingFileKey(file) {
  return file?.key || file?.serverData?.key || null;
}
