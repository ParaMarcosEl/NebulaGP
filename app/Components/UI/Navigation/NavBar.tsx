'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import './NavBar.css';
import cx from 'classnames';
import LogoutButton from '../Auth/Logout';
import AuthGuard from '../Auth/AuthGaurd';
import AuthForm from '../Auth/AuthForm';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import Modal from '../Modal/Modal';
import GameSettings from '../Settings/Settings';

export default function NavBar() {
  const { user } = useUserStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        <NavLinks setSettingsOpen={setSettingsOpen} />
      </div>
      <Modal isOpen={settingsOpen} onClose={()=>setSettingsOpen(false)}>
        <GameSettings />
      </Modal>
    </nav>
  );
}

// 🔗 Shared Nav Links Component
function NavLinks({ setSettingsOpen } : { setSettingsOpen: (v: boolean) => void }) {
  return (
    <AuthGuard fallback={<AuthForm />}>
      <button className='nav-btn' onClick={() => {
        console.log("click");
        setSettingsOpen(true);
      }}>Settings</button>
      <LogoutButton className={'nav-btn'} />
    </AuthGuard>
  );
}
