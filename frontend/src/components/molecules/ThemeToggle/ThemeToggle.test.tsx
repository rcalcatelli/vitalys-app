import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("con tema light, ofrece pasar a oscuro", () => {
    render(<ThemeToggle theme="light" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Modo oscuro" })).toBeInTheDocument();
  });

  it("con tema dark, ofrece pasar a claro", () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Modo claro" })).toBeInTheDocument();
  });

  it("al hacer clic llama a onToggle, sin conocer localStorage ni el router", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: "Modo oscuro" }));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
