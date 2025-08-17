// components/UserForm.tsx
"use client";

import { useState } from "react";
import { updateUser } from "@/Lib/api";
import { User } from "@/Constants/types";

interface Props {
  user: User;
}

export default function UserForm({ user }: Props) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser({ ...user, name, email });
    alert("User updated!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit">Save</button>
    </form>
  );
}
