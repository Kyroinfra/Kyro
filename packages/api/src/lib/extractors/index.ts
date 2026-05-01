import { extractPdf } from './pdf';
import { extractDocx } from './docx';
import { extractTxt } from './txt';
import { UnrecoverableError } from 'bullmq';

export const SUPPORTED_MIME_TYPES: Record<string, (filePath: string) => Promise<string>> = {
  'application/pdf': extractPdf,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': extractDocx,
  'text/plain': extractTxt,
};

export const SUPPORTED_MIME_TYPES_LIST = Object.keys(SUPPORTED_MIME_TYPES);

export async function extractText(mimeType: string, filePath: string): Promise<string> {
  const extractor = SUPPORTED_MIME_TYPES[mimeType];

  if (!extractor) {
    throw new UnrecoverableError(
      `Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, TXT`
    );
  }

  return extractor(filePath);
}