"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { compressPhoto, PhotoDecodeError } from "@/lib/photos/compress";
import { createClient } from "@/lib/supabase/client";

// DESIGN.md photo-picker. 96px 정사각 "+ 사진"(시안 P07·P09). 사진 1장을 고르면 브라우저에서 1MB 이하로 줄여
// Storage의 `<사용자 id>/` 폴더에 바로 올린다.
// 올리기에 실패해도 폼의 다른 입력은 그대로이고, 사진 없이 제출할 수 있다 (spec Q4, 8.6 P09).
// 폼에는 올린 경로가 숨은 칸(name)으로 들어간다. 실패하거나 지우면 빈 값이다.
// 수정(P08)은 지금 사진(initialPhoto)을 보이고 시작한다. X로 지우고 새로 고르면 바꾼다.

export type PhotoBucket = "socialing-photos" | "review-photos";

export type UploadedPhoto = {
  path: string;
  size: number;
  type: string;
  originalSize: number;
  originalType: string;
};

type PickerState =
  | { kind: "empty" }
  | { kind: "uploading" }
  | { kind: "selected"; photo: UploadedPhoto; previewUrl: string }
  /** 이미 저장된 사진 (수정 P08) */
  | { kind: "saved"; path: string; url: string }
  | { kind: "failed"; unreadable: boolean };

type PhotoPickerProps = {
  bucket: PhotoBucket;
  userId: string;
  /** 폼에 넣을 숨은 칸 이름 */
  name?: string;
  onChange?: (photo: UploadedPhoto | null) => void;
  /** "사진 없이 올리기"를 눌렀을 때 (사진 칸은 비워진다) */
  onSkip?: () => void;
  /** 올리는 중인지 (올리는 동안 폼 제출을 막을 때) */
  onUploadingChange?: (uploading: boolean) => void;
  /** 올리기에 실패한 채인지 (실패한 채 제출하면 사진 없이 저장하고 알릴 때, P07) */
  onFailedChange?: (failed: boolean) => void;
  /** 실패 칸의 두 번째 버튼 글자. 기본 "사진 없이 올리기"(P09) */
  skipLabel?: string;
  /** 처음에 보일 저장된 사진 (경로와 공개 주소) */
  initialPhoto?: { path: string; url: string } | null;
};

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function PhotoPicker({
  bucket,
  userId,
  name,
  onChange,
  onSkip,
  onUploadingChange,
  onFailedChange,
  skipLabel = "사진 없이 올리기",
  initialPhoto,
}: PhotoPickerProps) {
  const [state, setState] = useState<PickerState>(
    initialPhoto ? { kind: "saved", path: initialPhoto.path, url: initialPhoto.url } : { kind: "empty" },
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = state.kind === "selected" ? state.previewUrl : null;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function update(next: PickerState) {
    setState(next);
    onChange?.(next.kind === "selected" ? next.photo : null);
    onUploadingChange?.(next.kind === "uploading");
    onFailedChange?.(next.kind === "failed");
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 같은 사진을 다시 골라도 change가 일어나게 비운다
    event.target.value = "";
    if (!file) return;

    update({ kind: "uploading" });
    try {
      const compressed = await compressPhoto(file);
      const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[compressed.type]}`;
      const { error } = await createClient()
        .storage.from(bucket)
        .upload(path, compressed, { contentType: compressed.type, upsert: false });
      if (error) throw error;

      update({
        kind: "selected",
        previewUrl: URL.createObjectURL(compressed),
        photo: {
          path,
          size: compressed.size,
          type: compressed.type,
          originalSize: file.size,
          originalType: file.type || "알 수 없음",
        },
      });
    } catch (error) {
      update({ kind: "failed", unreadable: error instanceof PhotoDecodeError });
    }
  }

  return (
    <div>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={state.kind === "selected" ? state.photo.path : state.kind === "saved" ? state.path : ""}
        />
      ) : null}
      {/* accept="image/*": iPhone은 HEIC 사진을 JPEG로 바꿔서 넘겨 준다 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="사진 선택"
        className="sr-only"
        tabIndex={-1}
        onChange={onPick}
      />

      {state.kind === "empty" ? (
        <button
          type="button"
          aria-label="사진 선택 · 1장"
          onClick={() => inputRef.current?.click()}
          className="flex size-24 flex-col items-center justify-center gap-xxs rounded-lg border-[1.5px] border-dashed border-border-default bg-surface text-body-sm text-text-secondary"
        >
          <Plus className="size-6" aria-hidden />
          사진
        </button>
      ) : null}

      {state.kind === "uploading" ? (
        <div
          role="status"
          className="flex size-24 flex-col items-center justify-center gap-xs rounded-lg bg-primary-soft px-xs text-body-sm text-primary-strong"
        >
          올리는 중…
          <span className="h-1 w-full animate-pulse rounded-full bg-primary-strong" aria-hidden />
        </div>
      ) : null}

      {state.kind === "selected" || state.kind === "saved" ? (
        <div className="relative size-24">
          {/* eslint-disable-next-line @next/next/no-img-element -- 방금 고른 사진의 브라우저 미리보기(blob 주소) 또는 저장된 사진 */}
          <img
            src={state.kind === "selected" ? state.previewUrl : state.url}
            alt={state.kind === "selected" ? "고른 사진" : "지금 대표 사진"}
            className="size-24 rounded-lg object-cover"
          />
          <button
            type="button"
            aria-label="사진 지우기"
            onClick={() => update({ kind: "empty" })}
            className="absolute -top-2.5 -right-2.5 flex size-11 items-center justify-center"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-toast-bg text-toast-text">
              <X className="size-4" aria-hidden />
            </span>
          </button>
        </div>
      ) : null}

      {state.kind === "failed" ? (
        <div
          role="alert"
          className="flex min-h-24 w-full flex-col justify-center gap-xs rounded-lg border border-danger-border-soft bg-danger-soft px-md py-sm"
        >
          <p className="text-body-md text-danger">사진을 올리지 못했어요</p>
          {state.unreadable ? <p className="text-body-sm text-text-secondary">JPEG로 골라 주세요</p> : null}
          <div className="flex gap-xs">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
              다시 고르기
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                update({ kind: "empty" });
                onSkip?.();
              }}
            >
              {skipLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
