import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("asocia el label con el input y propaga onChange con el valor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();

    await user.type(input, "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });
});
