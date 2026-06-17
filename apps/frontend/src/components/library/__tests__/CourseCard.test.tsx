import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Course } from "@/lib/types";

import { CourseCard } from "../CourseCard";

const course: Course = {
  id: "c1",
  career_path_id: "p1",
  title: "Introducción a la adaptabilidad",
  slug: "l1-c1-intro",
  description: null,
  thumbnail_url: "https://cdn.humangrowth.io/videos/L1/C1/x/thumbnail.jpg",
  hls_master_url: "https://cdn.humangrowth.io/videos/L1/C1/x/master.m3u8",
  duration_seconds: 432,
  career_level: "L1",
  competency_code: "C1",
  track: "competency",
  is_active: true,
};

describe("CourseCard", () => {
  it("renders title, badges, thumbnail and formatted duration", () => {
    const { container } = render(<CourseCard course={course} />);
    expect(screen.getByText("Introducción a la adaptabilidad")).toBeTruthy();
    expect(screen.getByText("L1")).toBeTruthy();
    expect(screen.getByText("C1")).toBeTruthy();
    expect(screen.getByText("7:12")).toBeTruthy();
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(course.thumbnail_url);
  });

  it("omits competency badge when null (foundation)", () => {
    render(<CourseCard course={{ ...course, slug: "f", competency_code: null, track: "foundation_ai" }} />);
    expect(screen.queryByText("C1")).toBeNull();
  });
});
