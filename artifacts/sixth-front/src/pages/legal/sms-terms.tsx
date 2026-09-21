import rawSmsEmailTerms from '@/legal/sms-email-terms.txt?raw';
import { LegalDocumentPage } from './legal-document-page';

// Renders /home/.../src/legal/sms-email-terms.txt VERBATIM (attorney-approved, FINAL).
export default function SmsEmailTermsPage() {
  return <LegalDocumentPage title="SMS & Email Terms" body={rawSmsEmailTerms} />;
}
