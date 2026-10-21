import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  it("propaga el valor elegido como string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select aria-label="Día" value="1" onChange={onChange}>
        <option value="1">Lunes</option>
        <option value="2">Martes</option>
      </Select>,
    );

    await user.selectOptions(screen.getByLabelText("Día"), "2");
    expect(onChange).toHaveBeenCalledWith("2");
  });
});
