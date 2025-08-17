'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import './TopNav.css';
import LogoutButton from '../Auth/Logout';
import AuthGuard from '../Auth/AuthGaurd';
import AuthForm from '../Auth/AuthForm';
import { useUserStore } from '@/Controllers/Users/useUserStore';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUserStore();
  console.log({ user })
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          NebulaGP
        </Link>
        {/* Desktop Menu */}
        <div className="navbar-links desktop">
          <span>{user?.displayName}</span>
          <NavLinks />
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-button">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="menu-toggle"
            aria-label="Toggle menu"
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="navbar-links mobile">
          <NavLinks mobile />
        </div>
      )}
    </nav>
  );
}

// 🔗 Shared Nav Links Component
function NavLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <AuthGuard fallback={<AuthForm />}>
        <Link href="/" className={mobile ? "nav-link mobile-link" : "nav-link"}>Dashboard</Link>
        <Link href="/settings" className={mobile ? "nav-link mobile-link" : "nav-link"}>Settings</Link>
        <LogoutButton />
    </AuthGuard>
  );
}
