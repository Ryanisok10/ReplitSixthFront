export default function RefundPolicy() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-2">Refund &amp; Cancellation Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: September 22, 2026</p>
      <h2 className="font-semibold text-lg mb-2">Platform Service Fees</h2>
      <p className="mb-4">Sixth Front earns a platform service fee on each processed transaction (8% on food and QR ordering; 12% on merchandise). These fees are earned as transactions are processed and are non-refundable once captured via Stripe.</p>
      <h2 className="font-semibold text-lg mb-2">Standalone Web Page Subscription</h2>
      <p className="mb-4">The $39/month standalone web page subscription may be cancelled by the merchant per the terms of their Master Services Agreement. Fees already collected for the current billing period are non-refundable.</p>
      <h2 className="font-semibold text-lg mb-2">Customer Order Refunds</h2>
      <p className="mb-4">Customer order refunds and disputes are handled directly by the merchant through their Stripe dashboard. Sixth Front does not issue refunds on behalf of merchants. Stripe&apos;s standard dispute and refund process applies.</p>
      <h2 className="font-semibold text-lg mb-2">Questions</h2>
      <p>Contact <a href="mailto:support@sixthfront.com" className="underline">support@sixthfront.com</a> for any questions about this policy.</p>
    </main>
  );
}