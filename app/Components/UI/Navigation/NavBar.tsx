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
import AccountSettings from '../Settings/Account';
import AudioToggleButton from '@/Components/Audio/AudioToggle';
import InstallButton from '../Installer/Installer';
import PrevNextButtons from '@/Components/Audio/PrevNextButtons';

export default function NavBar() {
  const { user } = useUserStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

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
            <span className="name">Pilot: {user?.displayName} </span>
          </span>
        )}
        <PrevNextButtons />
        <AudioToggleButton />
        <NavLinks
          setRegisterOpen={setRegisterOpen}
          setAccountOpen={setAccountOpen}
          setSettingsOpen={setSettingsOpen}
        />
        <InstallButton />
      </div>
      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <GameSettings />
      </Modal>
      <Modal isOpen={accountOpen} onClose={() => setAccountOpen(false)}>
        <AccountSettings />
      </Modal>
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)}>
        <AuthForm className="auth-form" mode="register" setRegisterOpen={setRegisterOpen} />
      </Modal>
    </nav>
  );
}

// 🔗 Shared Nav Links Component
function NavLinks({
  setSettingsOpen,
  setAccountOpen,
  setRegisterOpen,
}: {
  setSettingsOpen: (v: boolean) => void;
  setRegisterOpen: (v: boolean) => void;
  setAccountOpen: (v: boolean) => void;
}) {
  return (
    <AuthGuard fallback={<AuthForm mode="login" setRegisterOpen={setRegisterOpen} />}>
      <button className="nav-btn" onClick={() => setSettingsOpen(true)}>
        Settings
      </button>
      <button className="nav-btn" onClick={() => setAccountOpen(true)}>
        Account
      </button>
      <LogoutButton className={'nav-btn'} />
    </AuthGuard>
  );
}
