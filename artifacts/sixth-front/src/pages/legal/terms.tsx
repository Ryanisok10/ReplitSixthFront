import rawWebsiteTerms from '@/legal/website-terms-of-use.txt?raw';
import { LegalDocumentPage } from './legal-document-page';

// Renders /home/.../src/legal/website-terms-of-use.txt VERBATIM (attorney-approved, FINAL).
export default function WebsiteTermsPage() {
  return <LegalDocumentPage title="Website Terms of Use" body={rawWebsiteTerms} />;
}
