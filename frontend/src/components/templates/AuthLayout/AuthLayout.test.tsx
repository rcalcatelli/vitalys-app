import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthLayout } from "./AuthLayout";

describe("AuthLayout", () => {
  it("renderiza el título, el contenido y el footer", () => {
    render(
      <AuthLayout title="VITALYS APP" footer={<p>pie de página</p>}>
        <p>contenido del form</p>
      </AuthLayout>,
    );

    expect(screen.getByRole("heading", { name: "VITALYS APP" })).toBeInTheDocument();
    expect(screen.getByText("contenido del form")).toBeInTheDocument();
    expect(screen.getByText("pie de página")).toBeInTheDocument();
  });

  it("funciona sin footer", () => {
    render(
      <AuthLayout title="VITALYS APP">
        <p>contenido del form</p>
      </AuthLayout>,
    );

    expect(screen.getByRole("heading", { name: "VITALYS APP" })).toBeInTheDocument();
  });
});
