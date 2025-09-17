'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/Lib/Firebase';
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { User as AppUser } from '@/Constants/types';
import cx from 'classnames';
import './AuthForm.css';
import { Input } from '../Forms/Input';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import { useAlertStore } from '@/Controllers/Alert/useAlertStore';
import { validatePassword, getPasswordStrength } from './AuthHelpers';
import { Spinner } from '@/Components/UI/Loader/Spinner';

interface AuthFormProps {
  mode?: 'login' | 'register';
  setRegisterOpen?: (v: boolean) => void;
  className?: string;
}

export const COUNTRIES = [
  'Argentina', 'Australia', 'Canada', 'China', 'France', 'Germany',
  'India', 'Japan', 'Mexico', 'United Kingdom', 'United States', 'Other',
];

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function AuthForm({ mode = 'login', setRegisterOpen }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [region, setRegion] = useState('');
  const [currentMode, setCurrentMode] = useState(mode);

  const { error, setError, createUser, fetchUserFromAPI } = useUserStore();
  const { setAlert } = useAlertStore();
  const { score, requirements } = getPasswordStrength(password);

  useEffect(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (error) {
      setAlert({ type: 'error', message: error });
    }
  }, [error]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setAlert({ type: 'error', message: 'Please enter your email first.' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setAlert({
        type: 'info',
        message: `Password reset email sent to ${email}. Please check your inbox.`,
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Password reset error:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to send password reset email.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (currentMode === 'register') {
        // Confirm password check
        if (password !== confirmPassword) {
          setAlert({ type: 'error', message: 'Passwords do not match.' });
          return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
          setAlert({ type: 'error', message: passwordError });
          return;
        }

        const newUser: AppUser & { password: string } = {
          email: normalizedEmail,
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

        createUser(newUser).then(async (data) => {
          if (typeof data?.data === 'object' && 'uid' in data.data) {
            const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            if (cred.user) {
              await sendEmailVerification(cred.user);
              setAlert({
                type: 'info',
                message: `Verification email sent to ${normalizedEmail}. Please check your inbox.`,
              });
            }
          }
        });

        if (setRegisterOpen) setRegisterOpen(false);
      } else {
        const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        if (cred.user) {
          if (!cred.user.emailVerified) {
            setAlert({
              type: 'error',
              message: 'Please verify your email before logging in.',
            });
            return;
          }
          await fetchUserFromAPI(cred.user.uid);
          setAlert({ type: 'info', message: `Logged in as ${cred.user.displayName || normalizedEmail}` });
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cx('auth-form', { 'register-form': currentMode === 'register' })}
    >
      {currentMode === 'register' && <h2>Account Info</h2>}

      <Input
        rootClass="input"
        label="Email"
        type="email"
        placeholder="Email"
        value={email}
        setValue={setEmail}
        required
        className="auth-input"
      />

      {currentMode === 'register' ? (
        <>
          <div className="input">
            <label htmlFor="password"><span className='required'>* </span>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          <div className="input">
            <label htmlFor="confirmPassword"><span className='required'>* </span>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          {/* Strength meter */}
          <div className="password-strengths">
            <ul className="password-hints">
              <li className={requirements.length ? 'valid' : ''}>8+ characters</li>
              <li className={requirements.uppercase ? 'valid' : ''}>At least one uppercase letter</li>
              <li className={requirements.number ? 'valid' : ''}>At least one number</li>
              <li className={requirements.symbol ? 'valid' : ''}>At least one symbol</li>
            </ul>
            <span className={`password-strength ${score}`}>
              {score === 'weak' && '🔴 Weak'}
              {score === 'medium' && '🟡 Medium'}
              {score === 'strong' && '🟢 Strong'}
            </span>
          </div>
        </>
      ) : (
        <Input
          rootClass="input"
          label="Password"
          type="password"
          placeholder="Password"
          value={password}
          setValue={setPassword}
          required
          className="auth-input"
        />
      )}

      {currentMode === 'register' && (
        <>
          <Input
            rootClass="input"
            label="Username"
            type="text"
            placeholder="Username"
            value={displayName}
            setValue={setDisplayName}
            className="auth-input"
            required
          />
          <Input
            rootClass="input"
            label="First Name"
            type="text"
            placeholder="First Name"
            value={firstName}
            setValue={setFirstName}
            className="auth-input"
            required
          />
          <Input
            rootClass="input"
            label="Last Name"
            type="text"
            placeholder="Last Name"
            value={lastName}
            setValue={setLastName}
            className="auth-input"
            required
          />
          <div className="address">
            <h2>Address (optional)</h2>
            </div>
            <Input
              type="text"
              rootClass="input"
              placeholder="Address Line 1"
              label="Address Line 1"
              value={address1}
              setValue={setAddress1}
              className="auth-input"
            />
            <Input
              type="text"
              rootClass="input"
              placeholder="Address Line 2"
              label="Address Line 2"
              value={address2}
              setValue={setAddress2}
              className="auth-input"
            />
            <Input
              rootClass="input"
              type="text"
              placeholder="City"
              label="City"
              value={city}
              setValue={setCity}
              className="auth-input"
            />
            {region === 'United States' && 
            
              <div className="input">
                <label htmlFor="state">State</label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="auth-input"
                >
                  <option value="">Select State</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            }
            <Input
              rootClass="input"
              label="Zip"
              type="text"
              placeholder="Zip"
              value={zip}
              setValue={setZip}
              className="auth-input"
            />
            <div className="input">
              <label htmlFor="region">Country/Region</label>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="auth-input"
              >
                <option value="">Select Region</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
          </div>
        </>
      )}

      <button
        type="submit"
        className="auth-button"
        disabled={loading}
      >
        {loading ? <Spinner size={0.3} /> : currentMode === 'register' ? 'Register' : 'Login'}
      </button>

      {currentMode === 'login' ? (
        <>
          <span className="auth-switch">
            <span>or</span>
            <button
              type="button"
              onClick={() => setCurrentMode('register')}
              className="auth-switch-btn register-btn"
            >
              Register
            </button>
          </span>
          
          <button
            type="button"
            className="auth-switch-btn forgot-btn"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            Forgot Password?
          </button>
        </>
      ) : (
        <span className="auth-switch">
          <span>or</span>
          <button type="button" onClick={() => setCurrentMode('login')} className="auth-switch-btn">
            Login
          </button>
        </span>
      )}
    </form>
  );
}
