import fs from 'fs';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * PDF text extraction via unpdf (modern pdfjs-dist, actively maintained).
 *
 * Replaced pdf-parse@1.1.4 (#59), whose bundled pdf.js v1.10.100 (2017)
 * hard-threw `FormatError: bad XRef entry` on cross-reference tables that
 * modern pdf.js reconstructs automatically.
 */
export async function extractPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(dataBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
