import path from 'path';
import fs from 'fs';

export const fixturePath = path.join(__dirname, 'fixtures');
export function fixtureFile(filename: string) {
  const filePath = path.join(fixturePath, filename);
  return fs.existsSync(filePath) ? filePath : '';
}
