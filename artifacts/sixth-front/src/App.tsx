import { Route, Router as WouterRouter, Switch } from "wouter";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Signup from "@/pages/signup";
import PaymentOnboardingReturn from "@/pages/payment-onboarding";
import PrivacyPolicyPage from "@/pages/legal/privacy";
import WebsiteTermsPage from "@/pages/legal/terms";
import CookieNoticePage from "@/pages/legal/cookies";
import SmsEmailTermsPage from "@/pages/legal/sms-terms";
import CodeReview from "@/pages/code-review";
import OrderCheckout from "@/pages/order";
import HowPaymentsWorkPage from "@/pages/how-payments-work";
import RefundPolicy from "@/pages/refund-policy";
import Contact from "@/pages/contact";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signup" component={Signup} />
      <Route path="/order/:id" component={OrderCheckout} />
      <Route
        path="/payment-onboarding/return"
        component={PaymentOnboardingReturn}
      />
      <Route path="/code-review" component={CodeReview} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={WebsiteTermsPage} />
      <Route path="/cookies" component={CookieNoticePage} />
      <Route path="/sms-terms" component={SmsEmailTermsPage} />
      <Route path="/how-it-works-payments" component={HowPaymentsWorkPage} />
      <Route path="/refund-policy" component={RefundPolicy} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppRouter />
    </WouterRouter>
  );
}
