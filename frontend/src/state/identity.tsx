import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  emptyIdentity,
  identityKey,
  loadIdentity,
  saveIdentity,
} from "../lib/storage";
import type { Identity, SessionRef } from "../lib/storage";
import type { Student } from "../api/types";

interface IdentityContextValue {
  identity: Identity;
  storageError: boolean;
  setStudent: (student: Student) => void;
  remember: (session: SessionRef) => void;
  reset: () => void;
}
const Context = createContext<IdentityContextValue | null>(null);
export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState(loadIdentity);
  const latest = useRef(identity);
  const [storageError, setStorageError] = useState(false);
  const queries = useQueryClient();
  const update = (value: Identity) => {
    latest.current = value;
    setIdentity(value);
    setStorageError(!saveIdentity(value));
  };
  const reset = () => {
    void queries.cancelQueries();
    queries.clear();
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(`${identityKey}:`))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {
      /* Browser storage may be unavailable. */
    }
    update(emptyIdentity());
  };
  return (
    <Context.Provider
      value={{
        identity,
        storageError,
        setStudent: (student) => update({ ...latest.current, student }),
        remember: (session) =>
          update({
            ...latest.current,
            current: session.id,
            sessions: [
              session,
              ...latest.current.sessions.filter((s) => s.id !== session.id),
            ].slice(0, 30),
          }),
        reset,
      }}
    >
      {children}
    </Context.Provider>
  );
}
// Kept with provider so the context's identity is stable across modules.
// eslint-disable-next-line react-refresh/only-export-components
export function useIdentity() {
  const context = useContext(Context);
  if (!context) throw new Error("IdentityProvider missing");
  return context;
}
