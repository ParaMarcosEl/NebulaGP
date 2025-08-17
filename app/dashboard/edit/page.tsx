// app/editAccount/page.tsx
import { useEffect, useState } from "react";
import { getUsers } from "@/Lib/api";
import { User } from "@/Constants/types";
import UserForm from "@/Components/UserForm/UserForm";

export default function EditAccountPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUsers().then(users => setUser(users[0] || null)); // example: first user
  }, []);

  if (!user) return <p>Loading...</p>;

  return <UserForm user={user} />;
}
