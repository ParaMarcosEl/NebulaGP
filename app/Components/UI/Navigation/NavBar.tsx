'use client';
import React, { useState } from 'react';
import './NavBar.css';
import cx from 'classnames';
import LogoutButton from '../Auth/Logout';
import AuthGuard from '../Auth/AuthGaurd';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import Modal from '../Modal/Modal';
import GameSettings from '../Settings/Settings';
import AccountSettings from '../Settings/Account';
import AudioToggleButton from '@/Components/Audio/AudioToggle';
import InstallButton from '../Installer/Installer';
import PrevNextButtons from '@/Components/Audio/PrevNextButtons';
import About from '../About/About';
import { User } from '@/Constants/types';

export default function NavBar({
  uiContainerRef,
}: {
  uiContainerRef?: React.RefObject<HTMLElement>;
}) {
  const { user } = useUserStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const scrollToTop = () => {
    uiContainerRef?.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="navbar-container">
      <div className={cx('navbar')}>
        {/* Logo */}
        <button className="navbar-logo" onClick={scrollToTop}>
          NebulaGP
        </button>
        {/* Desktop Menu */}
        <div className="navbar-links desktop">
          <PrevNextButtons />
          <AudioToggleButton />
          <NavLinks
            setRegisterOpen={() => {}}
            setAccountOpen={setAccountOpen}
            setSettingsOpen={setSettingsOpen}
            setAboutOpen={setAboutOpen}
          />
          <InstallButton />
        </div>
        <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <GameSettings />
        </Modal>
        <Modal isOpen={accountOpen} onClose={() => setAccountOpen(false)}>
          <AccountSettings />
        </Modal>
        <Modal isOpen={aboutOpen} onClose={() => setAboutOpen(false)}>
          <About />
        </Modal>
      </div>
      <div className="account-navbar">
        <AccountLinks scrollToTop={scrollToTop} user={user} setAccountOpen={setAccountOpen} />
      </div>
    </div>
  );
}

// 🔗 Shared Nav Links Component
function NavLinks({
  setSettingsOpen,
  setAboutOpen,
}: {
  setSettingsOpen: (v: boolean) => void;
  setRegisterOpen: (v: boolean) => void;
  setAccountOpen: (v: boolean) => void;
  setAboutOpen: (v: boolean) => void;
}) {
  return (
    <>
      <button className="nav-btn" onClick={() => setSettingsOpen(true)}>
        Settings
      </button>
      <button className="nav-btn" onClick={() => setAboutOpen(true)}>
        About
      </button>
    </>
  );
}

// 🔗 Shared Nav Links Component
function AccountLinks({
  user,
  setAccountOpen,
  scrollToTop,
}: {
  user: User | null;
  setAccountOpen: (v: boolean) => void;
  scrollToTop: () => void;
}) {
  return (
    <>
      <AuthGuard>
        <button className="nav-btn" onClick={() => setAccountOpen(true)}>
          Account
        </button>
        <LogoutButton className={'nav-btn'} />
        <span className="user">
          <button onClick={scrollToTop} className="name">
            Pilot: {user?.displayName}{' '}
          </button>
        </span>
      </AuthGuard>
    </>
  );
}
