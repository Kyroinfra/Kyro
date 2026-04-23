import fs from 'fs';

export async function extractTxt(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}