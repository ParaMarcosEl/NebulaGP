'use client';

import { useState } from 'react';
import { auth } from '@/Lib/Firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { User as AppUser } from '@/Constants/types';
import cx from 'classnames';
import './AuthForm.css';
import { Input } from '../Forms/Input';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import { useAlertStore } from '@/Controllers/Alert/useAlertStore';

interface AuthFormProps {
  mode?: 'login' | 'register'; // optional, defaults to login
  setRegisterOpen?: (v: boolean) => void;
  className?: string;
}

export default function AuthForm({ mode = 'login', setRegisterOpen }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLasttName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [region, setRegion] = useState('');

  const { error, createUser, fetchUserFromAPI } = useUserStore();
  const { setAlert } = useAlertStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'register') {
        const newUser: AppUser & { password: string } = {
          email,
          password,
          name: displayName,
          firstName,
          lastName,
          address1,
          address2,
          city,
          state,
          zip,
          region,
          role: 'player',
        };
        const data = await createUser(newUser);
        if (data?.uid) await signInWithEmailAndPassword(auth, email, password);
        setAlert({ type: 'info', message: `${displayName} registered.`})
        if(setRegisterOpen) setRegisterOpen(false)
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (cred.user.uid) {
          await fetchUserFromAPI(cred.user.uid);
          setAlert({ type: 'info', message: `Logged in as ${cred.user.displayName}`})
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cx('auth-form', { 'register-form': mode === 'register' })}
    >
    {mode === "register" && <h2>Account Info</h2>}
        <Input
          rootClass='input'
          label='Email'
          type="email"
          placeholder="Email"
          value={email}
          setValue={(e) => setEmail(e)}
          required
          className="auth-input"
        />
      <Input
        rootClass='input'
        label='Password'
        type="password"
        placeholder="Password"
        value={password}
        setValue={(e) => setPassword(e)}
        required
        className="auth-input"
      />
      {mode === 'register' && (
        <>
          <Input
            rootClass='input'
            label="Username"
            type="text"
            placeholder="Username"
            value={displayName}
            setValue={(e) => setDisplayName(e)}
            className="auth-input"
            required
            />
          <Input
            rootClass='input'
            label="First Name"
            type="text"
            placeholder="First Name"
            value={firstName}
            setValue={(e) => setFirstName(e)}
            className="auth-input"
            required
            />
          <Input
            type="text"
            rootClass='input'
            placeholder="Last Name"
            label="Last Name"
            value={lastName}
            setValue={(e) => setLasttName(e)}
            className="auth-input"
            required
            />
          <div className="address">
            <h2>{'Address (optional)'}</h2>
            <Input
              type="text"
            rootClass='input'
            placeholder="Address Line 1"
            label="Address Line 1"
            value={address1}
            setValue={(e) => setAddress1(e)}
            className="auth-input"
            />
            <Input
              type="text"
            rootClass='input'
            placeholder="Address Line 2"
            label="Address Line 2"
            value={address2}
            setValue={(e) => setAddress2(e)}
            className="auth-input"
            />
            <Input
            rootClass='input'
            type="text"
            placeholder="City"
            label="City"
            value={city}
            setValue={(e) => setCity(e)}
            className="auth-input"
            />
            <Input
            rootClass='input'
            type="text"
            placeholder="State"
            label="State"
            value={state}
            setValue={(e) => setState(e)}
            className="auth-input"
            />
            <Input
            rootClass='input'
            label="Zip"
            type="text"
            placeholder="Zip"
            value={zip}
            setValue={(e) => setZip(e)}
            className="auth-input"
            />
            <Input
              rootClass='input'
              label="Country/Region"
              type="text"
              placeholder="Country/Region"
              value={region}
              setValue={(e) => setRegion(e)}
              className="auth-input"
            />
          </div>
        </>
      )}
      {error && <p className="auth-error">{error}</p>}

      <button type="submit" className="auth-button">
        {mode === 'register' ? 'Register' : 'Login'}
      </button>

      {mode === 'login' ? (
        <span className="auth-switch">
          <span>or</span>
          <button
            type="button"
            onClick={() => setRegisterOpen && setRegisterOpen(true)}
            className="auth-switch-btn"
          >
            Register
          </button>
        </span>
      ) : (
        <span className="auth-switch">
          <span>or</span>
          <button type="button" onClick={() => {}} className="auth-switch-btn">
            Login
          </button>
        </span>
      )}
    </form>
  );
}
