import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex items-center justify-between border-t border-white/10 bg-[#0a0a0a] px-6 py-4 text-sm text-white/40">
      <span>© 2026 Verbly. All rights reserved.</span>
      <nav className="flex gap-8">
        <Link href="/contact" className="transition-colors hover:text-white/70">
          Contact Support
        </Link>
        <Link href="/privacy-policy" className="transition-colors hover:text-white/70">
          Privacy Policy
        </Link>
        <Link href="/tos" className="transition-colors hover:text-white/70">
          Terms of Service
        </Link>
      </nav>
    </footer>
  );
}
