import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputFile = path.join(
  scriptDirectory,
  '..',
  'src',
  'data',
  'content-metadata.json',
);

// The legacy filesystem catalog is intentionally disabled. Production content
// is created in the authenticated admin workspace and stored in PostgreSQL/R2.
fs.writeFileSync(outputFile, '[]\n');
console.info('Legacy content metadata disabled; using the database catalog.');
