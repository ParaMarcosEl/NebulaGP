'use client';

import { useState } from "react";
import { auth } from "@/Lib/Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useUser } from "@/Controllers/Users/useUser";
import { User as AppUser } from "@/Constants/types";
import './AuthForm.css';

interface AuthFormProps {
  mode?: "login" | "register"; // optional, defaults to login
}

export default function AuthForm({ mode = "login" }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentMode, setCurrentMode] = useState<"login" | "register">(mode);

  const { error, createUser, fetchUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentMode === "register") {
        const newUser: AppUser & { password: string } = {
          email,
          password,
          name: displayName,
          role: 'player'
        };
        await createUser(newUser);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (cred.user.uid) {
            await fetchUser(cred.user.uid);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="auth-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="auth-input"
      />
      {currentMode === "register" && (
        <input
          type="text"
          placeholder="Username"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="auth-input"
        />
      )}
      {error && <p className="auth-error">{error}</p>}

      <button type="submit" className="auth-button">
        {currentMode === "register" ? "Register" : "Login"}
      </button>

      {currentMode === "login" ? (
        <span className="auth-switch">
          or
          <button
            type="button"
            onClick={() => setCurrentMode("register")}
            className="auth-switch-btn"
          >
            Register
          </button>
        </span>
      ) : (
        <p className="auth-switch">
          or
          <button
            type="button"
            onClick={() => setCurrentMode("login")}
            className="auth-switch-btn"
          >
            Login
          </button>
        </p>
      )}
    </form>
  );
}
