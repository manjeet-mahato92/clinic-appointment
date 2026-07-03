import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <div className="font-display text-5xl font-bold text-ink mb-2">404</div>
        <p className="text-slate-soft mb-4">That page doesn't exist.</p>
        <Link to="/login" className="btn-primary">Go to login</Link>
      </div>
    </div>
  );
}
