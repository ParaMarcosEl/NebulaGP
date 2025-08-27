'use client';

import { useState } from 'react';
import { useUser } from '@/Controllers/Users/useUser';
import './Account.css';
import { useUserStore } from '@/Controllers/Users/useUserStore';

export default function AccountSettings() {
  const { updateUser, loading, error } = useUser();
  const { user, setUser } = useUserStore((s) => s);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      <h2 className="accountsettings__title">Account Settings</h2>

      {error && <p className="accountsettings__error">{error}</p>}
      {message && <p className="accountsettings__message">{message}</p>}

      <form onSubmit={handleSubmit} className="accountsettings__form">
        <div className="accountsettings__field">
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={formData.displayName}
            onChange={handleChange}
          />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">Email</label>
          <input
            id="email"
            name="email"
            type="text"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">Address Line 1</label>
          <input
            id="address1"
            name="address1"
            type="text"
            value={formData.address1}
            onChange={handleChange}
          />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">Address Line 2</label>
          <input
            id="address2"
            name="address2"
            type="text"
            value={formData.address2}
            onChange={handleChange}
          />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">City</label>
          <input id="city" name="city" type="text" value={formData.city} onChange={handleChange} />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">State</label>
          <input
            id="state"
            name="state"
            type="text"
            value={formData.state}
            onChange={handleChange}
          />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">Zip</label>
          <input id="zip" name="zip" type="text" value={formData.zip} onChange={handleChange} />
        </div>
        <div className="accountsettings__field">
          <label htmlFor="displayName">Country/Region</label>
          <input
            id="region"
            name="region"
            type="text"
            value={formData.region}
            onChange={handleChange}
          />
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
