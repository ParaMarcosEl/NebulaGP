// lib/api.ts
import { User } from '@/Constants/types';

const API_URL = '/api/users';

export async function getUsers() {
  const res = await fetch(API_URL);
  return res.json() as Promise<User[]>;
}

export async function createUser(user: User) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return res.json() as Promise<User>;
}

export async function updateUser(user: User) {
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_URL}?id=${id}`, {
    method: 'DELETE',
  });
  return res.json();
}
