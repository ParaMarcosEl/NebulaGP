'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/Lib/Firebase';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { User as AppUser } from '@/Constants/types';
import cx from 'classnames';
import './AuthForm.css';
import { Input } from '../Forms/Input';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import { useAlertStore } from '@/Controllers/Alert/useAlertStore';
import { validatePassword, getPasswordStrength } from './AuthHelpers';
import { Spinner } from '@/Components/UI/Loader/Spinner';

interface AuthFormProps {
  mode?: 'login' | 'register'; // optional, defaults to login
  setRegisterOpen?: (v: boolean) => void;
  className?: string;
}

export const COUNTRIES = [
  'Argentina',
  'Australia',
  'Antigua and Barbuda',
  'Bahamas',
  'Barbados',
  'Belgium',
  'Belize',
  'Bolivia',
  'Brazil',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Costa Rica',
  'Cuba',
  'Denmark',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'El Salvador',
  'France',
  'Germany',
  'Grenada',
  'Guyana',
  'Haiti',
  'Honduras',
  'India',
  'Ireland',
  'Italy',
  'Jamaica',
  'Japan',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Norway',
  'Panama',
  'Paraguay',
  'Peru',
  'Poland',
  'Russia',
  'Saudi Arabia',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'Trinidad and Tobago',
  'Turkey',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Venezuela',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Other'
];

// Add this array at the top of your file
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function AuthForm({ mode = 'login', setRegisterOpen }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
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

  const { error, setError, createUser, fetchUserFromAPI } = useUserStore();
  const { setAlert } = useAlertStore();
  const { score, requirements } = getPasswordStrength(password);

  useEffect(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!error) return;

    setAlert({ type: "error", message: error })
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        const passwordError = validatePassword(password);
        if (passwordError) {
          setAlert({ type: "error", message: passwordError });
          return;
        }

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

  // Save to your backend
  createUser(newUser).then(async (data) => {
    if (typeof data?.data === 'object' && 'uid' in data.data) {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      if (cred.user) {
        await sendEmailVerification(cred.user);
        console.log('email sent.')
        setAlert({
          type: 'info',
          message: `Verification email sent to ${email}. Please check your inbox.`,
        });
      }
    }
  });

  if (setRegisterOpen) setRegisterOpen(false);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (cred.user) {
          if (!cred.user.emailVerified) {
            setAlert({
              type: 'error',
              message: 'Please verify your email before logging in.',
            });
            return;
          }

          await fetchUserFromAPI(cred.user.uid);
          setAlert({ type: 'info', message: `Logged in as ${cred.user.displayName}` });
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
      className={cx('auth-form', { 'register-form': mode === 'register' })}
    >
      {mode === 'register' && <h2>Account Info</h2>}
      <Input
        rootClass="input"
        label="Email"
        type="email"
        placeholder="Email"
        value={email}
        setValue={(e) => setEmail(e)}
        required
        className="auth-input"
      />
      {mode === 'register' ? 
      
<>
<div className="input">
  <label htmlFor="password">Password</label>
  <input
    id="password"
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="auth-input"
    required
  />


</div> 
  {/* Strength meter */}
  <div className={'password-strengths'}>
    {/* Requirement checklist */}
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
</>:

      <Input
        rootClass="input"
        label="Password"
        type="password"
        placeholder="Password"
        value={password}
        setValue={(e) => setPassword(e)}
        required
        className="auth-input"
      />
}
      {mode === 'register' && (
        <>
          <Input
            rootClass="input"
            label="Username"
            type="text"
            placeholder="Username"
            value={displayName}
            setValue={(e) => setDisplayName(e)}
            className="auth-input"
            required
          />
          <Input
            rootClass="input"
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
            rootClass="input"
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
              rootClass="input"
              placeholder="Address Line 1"
              label="Address Line 1"
              value={address1}
              setValue={(e) => setAddress1(e)}
              className="auth-input"
            />
            <Input
              type="text"
              rootClass="input"
              placeholder="Address Line 2"
              label="Address Line 2"
              value={address2}
              setValue={(e) => setAddress2(e)}
              className="auth-input"
            />
            <Input
              rootClass="input"
              type="text"
              placeholder="City"
              label="City"
              value={city}
              setValue={(e) => setCity(e)}
              className="auth-input"
            />
            <div className="input">
              <label htmlFor="state">State: </label>
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
            <Input
              rootClass="input"
              label="Zip"
              type="text"
              placeholder="Zip"
              value={zip}
              setValue={(e) => setZip(e)}
              className="auth-input"
            />

  <div className="input">
    <label htmlFor="region">Country/Region:</label>
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
          </div>
        </>
      )}
      {mode === 'register' &&
        <button type="submit" className="auth-button">
          {loading ? <Spinner size={.3} /> : "Register"}
        </button>
      }
      {mode === 'login' &&
        <button type="submit" className="auth-button">
          {loading ? <Spinner size={.3} /> : "Login"}
        </button>
      }

      {mode === 'login' ? (
        <span className="auth-switch">
          <span>or</span>
          <button
            type="button"
            onClick={() => setRegisterOpen && setRegisterOpen(true)}
            className="auth-switch-btn register-btn"
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
