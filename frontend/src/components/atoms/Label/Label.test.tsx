import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "./Label";

describe("Label", () => {
  it("asocia el texto con su input vía htmlFor/id", () => {
    render(
      <>
        <Label htmlFor="email-input">Email</Label>
        <input id="email-input" />
      </>,
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
