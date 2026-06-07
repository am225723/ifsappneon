import { createUploadthing } from 'uploadthing/server';
import { ADMIN_ROLES, THERAPIST_ROLES, sql } from './_auth.js';

const f = createUploadthing();

async function requireAdvisorOrAdmin(userId) {
  if (!userId || userId === 'pin-auth-user') throw new Error('Unauthorized');
  const rows = await sql`
    SELECT id, user_role
    FROM ifs_clients
    WHERE clerk_user_id = ${userId}
    LIMIT 1
  `;
  const user = rows[0];
  if (!user || (!THERAPIST_ROLES.has(user.user_role) && !ADMIN_ROLES.has(user.user_role))) {
    throw new Error('Advisor or Admin upload access required');
  }
  return { userId, appUserId: user.id, role: user.user_role };
}

function publicFileUrl(file) {
  return file.ufsUrl || file.url || null;
}

async function recordUpload({ metadata, file, category }) {
  const url = publicFileUrl(file);
  await sql`
    INSERT INTO ifs_uploads (clerk_user_id, uploadthing_key, url, name, size, type, created_at)
    VALUES (${metadata.userId}, ${file.key}, ${url}, ${file.name}, ${file.size}, ${file.type}, NOW())
    ON CONFLICT (uploadthing_key) DO UPDATE SET
      url = EXCLUDED.url,
      name = EXCLUDED.name,
      size = EXCLUDED.size,
      type = EXCLUDED.type
  `;
  return { uploadedBy: metadata.userId, key: file.key, url, ufsUrl: file.ufsUrl || url, category };
}

export const ourFileRouter = {
  ifsAttachment: f({
    image: { maxFileSize: '8MB', maxFileCount: 4 },
    pdf: { maxFileSize: '16MB', maxFileCount: 2 },
    text: { maxFileSize: '2MB', maxFileCount: 4 }
  })
    .middleware(async ({ req }) => {
      const userId = req.userId;
      if (!userId) throw new Error('Unauthorized');
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return recordUpload({ metadata, file, category: 'ifsAttachment' });
    }),

  meditationAudioUploader: f({
    audio: { maxFileSize: '32MB', maxFileCount: 1 }
  })
    .middleware(async ({ req }) => requireAdvisorOrAdmin(req.userId))
    .onUploadComplete(async ({ metadata, file }) => recordUpload({ metadata, file, category: 'meditationAudioUploader' })),

  meditationImageUploader: f({
    image: { maxFileSize: '8MB', maxFileCount: 2 }
  })
    .middleware(async ({ req }) => requireAdvisorOrAdmin(req.userId))
    .onUploadComplete(async ({ metadata, file }) => recordUpload({ metadata, file, category: 'meditationImageUploader' }))
};

export default ourFileRouter;
