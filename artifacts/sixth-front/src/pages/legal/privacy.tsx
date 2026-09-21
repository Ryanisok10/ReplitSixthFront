import rawPrivacyPolicy from '@/legal/privacy-policy.txt?raw';
import { LegalDocumentPage } from './legal-document-page';

// Renders /home/.../src/legal/privacy-policy.txt VERBATIM (attorney-approved, FINAL).
export default function PrivacyPolicyPage() {
  return <LegalDocumentPage title="Privacy Policy" body={rawPrivacyPolicy} />;
}
