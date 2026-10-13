"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { TextField } from "@/components/text-field";

// DESIGN.md text-field/password. text-field 오른쪽 안에 눈 아이콘 버튼(터치 44px)을 두고 누르면 비밀번호를 보이거나 숨긴다.
// 아이콘은 지금 상태(숨김 = 빗금 눈, 시안대로), 버튼 이름은 누르면 할 일("비밀번호 보기" / "비밀번호 숨기기").

type PasswordFieldProps = Omit<React.ComponentProps<typeof TextField>, "type" | "trailing">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? Eye : EyeOff;

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          aria-controls={`field-${props.name}`}
          className="inline-flex size-touch-min items-center justify-center rounded-lg text-text-muted active:text-text-primary"
        >
          <Icon className="size-5" aria-hidden />
        </button>
      }
    />
  );
}
