import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("usa las medidas pedidas y el radio de las barras de texto por defecto", () => {
    const { container } = render(<Skeleton ancho="72%" alto={14} />);
    const barra = container.firstElementChild as HTMLElement;
    expect(barra).toHaveStyle({ width: "72%", height: "14px", borderRadius: "6px" });
    expect(barra).toHaveAttribute("aria-hidden", "true");
  });

  it("acepta ancho en px y radio propio", () => {
    const { container } = render(<Skeleton ancho={96} alto={22} radio={999} />);
    expect(container.firstElementChild).toHaveStyle({ width: "96px", borderRadius: "999px" });
  });

  it("tiene brillo animado que se apaga con reduce-motion", () => {
    const { container } = render(<Skeleton alto={10} />);
    expect(container.firstElementChild).toHaveClass(
      "animate-vt-shimmer",
      "motion-reduce:animate-none",
    );
  });
});
