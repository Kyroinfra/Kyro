import fs from 'fs';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * PDF text extraction via unpdf — modern, actively maintained pdfjs-dist.
 * (The previous pdf-parse bundled pdf.js from 2017, which hard-threw on
 * recoverable XRef damage modern pdf.js reconstructs automatically; #59.)
 */
export async function extractPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(dataBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
