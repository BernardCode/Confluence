import { useSyncExternalStore } from "react";
import {
  reducer,
  loadState,
  initialState,
  type Action,
  type State,
} from "./reducer";

const KEY = "leaklens:v1";
let state: State | null = null;
const subs = new Set<() => void>();
const SERVER = initialState();

function get(): State {
  if (state) return state;
  if (typeof window === "undefined") return SERVER;
  try {
    state = loadState(localStorage.getItem(KEY));
  } catch {
    state = initialState();
  }
  return state;
}
export function dispatch(a: Action) {
  state = reducer(get(), a);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  subs.forEach((f) => f());
}
export function useLeakLens(): State {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    get,
    () => SERVER,
  );
}
