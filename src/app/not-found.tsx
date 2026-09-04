import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="font-mono text-2xl mb-4">HANDLE NOT FOUND</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        This handle has not been claimed, or the page does not exist.
      </p>
      <Link href="/claim" className="btn-primary">
        CLAIM A HANDLE
      </Link>
    </div>
  );
}
