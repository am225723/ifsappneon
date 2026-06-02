import { createUploadthing } from 'uploadthing/server';
import { sql } from './_auth.js';

const f = createUploadthing();

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
      await sql`
        INSERT INTO ifs_uploads (clerk_user_id, uploadthing_key, url, name, size, type, created_at)
        VALUES (${metadata.userId}, ${file.key}, ${file.url}, ${file.name}, ${file.size}, ${file.type}, NOW())
      `;
      return { uploadedBy: metadata.userId, key: file.key, url: file.url };
    })
};

export default ourFileRouter;
