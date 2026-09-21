import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper text-ink p-4">
      <div className="text-center">
        <h1 className="text-6xl font-display font-bold text-red mb-4">404</h1>
        <p className="text-xl text-muted mb-8">Page not found</p>
        <Link href="/" data-testid="link-not-found-home" className="bg-tomato hover:bg-tomato-dark text-white font-bold py-3 px-6 rounded-lg transition-colors">Go Home</Link>
      </div>
    </div>
  );
}
