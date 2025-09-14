'use client';

import { useState } from 'react';
import { useUser } from '@/Controllers/Users/useUser';
import './Account.css';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import { COUNTRIES, US_STATES } from '../Auth/AuthForm';

export default function AccountSettings() {
  const { updateUser, loading, error } = useUser();
  const { user, setUser } = useUserStore((s) => s);

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    address1: user?.address1 || '',
    address2: user?.address2 || '',
    city: user?.city || '',
    state: user?.state || '',
    zip: user?.zip || '',
    region: user?.region || '',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) {
    return <p className="accountsettings__notice">No user signed in.</p>;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateUser(user.id || user.uid || '', formData);
      setMessage(res.message);
      setUser({ ...user, ...formData }); // optimistic update
    } catch (err) {
      console.error(err);
      setMessage('Failed to update user.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="accountsettings">
      {error && <p className="accountsettings__error">{error}</p>}
      {message && <p className="accountsettings__message">{message}</p>}

      <form onSubmit={handleSubmit} className="accountsettings__form">
        <h2>Account Info</h2>
        <div>
          <div className="accountsettings__field">
            <label htmlFor="displayName">Username: </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleChange}
            />
          </div>

          <div className="accountsettings__field">
            <label htmlFor="email">Email: </label>
            <input
              disabled
              id="email"
              name="email"
              type="text"
              value={user?.email}
            />
          </div>

          <div className="accountsettings__field">
            <label htmlFor="firstName">First Name: </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
            />
          </div>

          <div className="accountsettings__field">
            <label htmlFor="lastName">Last Name: </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>
        </div>

        <h2>Address</h2>

        <div className="accountsettings__field">
          <label htmlFor="address1">Address Line 1: </label>
          <input
            id="address1"
            name="address1"
            type="text"
            value={formData.address1}
            onChange={handleChange}
          />
        </div>

        <div className="accountsettings__field">
          <label htmlFor="address2">Address Line 2: </label>
          <input
            id="address2"
            name="address2"
            type="text"
            value={formData.address2}
            onChange={handleChange}
          />
        </div>

        <div className="accountsettings__field">
          <label htmlFor="city">City: </label>
          <input
            id="city"
            name="city"
            type="text"
            value={formData.city}
            onChange={handleChange}
          />
        </div>

        <div className="accountsettings__field">
          <label htmlFor="state">State: </label>
          <select
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
          >
            <option value="">Select State</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="accountsettings__field">
          <label htmlFor="zip">Zip: </label>
          <input
            id="zip"
            name="zip"
            type="text"
            value={formData.zip}
            onChange={handleChange}
          />
        </div>

        <div className="accountsettings__field">
          <label htmlFor="region">Country/Region:</label>
          <select
            id="region"
            name="region"
            value={formData.region}
            onChange={handleChange}
          >
            <option value="">Select Region</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="accountsettings__update">
          <button type="submit" disabled={saving || loading}>
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </form>
    </div>
  );
}
