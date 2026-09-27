import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Desmonta el árbol de React y limpia `localStorage` entre tests: los del
// AuthContext escriben el token real en localStorage y, sin este reset, un test
// contaminaría el estado inicial (isLoading/token) del siguiente.
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
