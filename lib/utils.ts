import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// DESIGN.md 글자 토큰(text-title-xl 등)을 글자 크기로 알려 줘야
// text-text-primary 같은 색 클래스와 서로 지우지 않는다.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["title-xl", "title-lg", "title-md", "body-lg", "body-long", "body-md", "body-sm", "label"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
