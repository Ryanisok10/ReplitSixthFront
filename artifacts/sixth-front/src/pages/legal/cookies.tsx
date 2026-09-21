import rawCookieNotice from '@/legal/cookie-notice.txt?raw';
import { LegalDocumentPage } from './legal-document-page';

// Renders /home/.../src/legal/cookie-notice.txt VERBATIM (attorney-approved, FINAL).
export default function CookieNoticePage() {
  return <LegalDocumentPage title="Cookie Notice" body={rawCookieNotice} />;
}
