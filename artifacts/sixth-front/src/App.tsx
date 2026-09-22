import React from 'react';
import { Router, Route } from 'wouter';

// Import page components
import HomePage from './pages/home';
import SignupPage from './pages/signup';
import PaymentOnboardingPage from './pages/payment-onboarding';
import CheckoutPage from './pages/checkout';
import NotFoundPage from './pages/not-found';

export default function App() {
  return (
    <Router>
      <Route path="/" component={HomePage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/payment-onboarding" component={PaymentOnboardingPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route component={NotFoundPage} />
    </Router>
  );
}
