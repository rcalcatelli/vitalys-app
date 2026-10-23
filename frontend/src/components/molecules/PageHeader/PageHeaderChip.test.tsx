import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShellContext } from "../../templates/AppShell/ShellContext";
import { PageHeader } from "./PageHeader";

describe("PageHeader dentro del shell", () => {
  it("muestra el chip de fecha y hora cuando el shell lo informa", () => {
    render(
      <ShellContext.Provider value={{ chipAhora: "Mar 29 sep · 10:40" }}>
        <PageHeader titulo="Hoy" />
      </ShellContext.Provider>,
    );
    expect(screen.getByText("Mar 29 sep · 10:40")).toBeInTheDocument();
  });

  it("no lo muestra en mobile (chip nulo)", () => {
    render(
      <ShellContext.Provider value={{ chipAhora: null }}>
        <PageHeader titulo="Hoy" />
      </ShellContext.Provider>,
    );
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});
