'use client';
import React from 'react';
import Link from 'next/link';
import './NavBar.css';
import cx from 'classnames';
import LogoutButton from '../Auth/Logout';
import AuthGuard from '../Auth/AuthGaurd';
import AuthForm from '../Auth/AuthForm';
import { useUserStore } from '@/Controllers/Users/useUserStore';

export default function NavBar() {
  const { user } = useUserStore();

  return (
    <nav className={cx('navbar')}>
      {/* Logo */}
      <Link href="/" className="navbar-logo">
        NebulaGP
      </Link>
      {/* Desktop Menu */}
      <div className="navbar-links desktop">
        {user && (
          <span className="user">
            logged in as <span className="name">{user?.displayName}</span>
          </span>
        )}
        <NavLinks />
      </div>
    </nav>
  );
}

// 🔗 Shared Nav Links Component
function NavLinks() {
  return (
    <AuthGuard fallback={<AuthForm />}>
      {/* <Link href="/" className={"nav-link"}>Dashboard</Link>
        <Link href="/settings" className={"nav-link"}>Settings</Link> */}
      <LogoutButton />
    </AuthGuard>
  );
}
