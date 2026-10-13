"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { PhotoPicker, type UploadedPhoto } from "@/components/photo-picker";

const MB = 1024 * 1024;
const formatSize = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(2)}MB` : `${Math.round(bytes / 1024)}KB`);

/** 글과 사진을 함께 넣고 "제출 확인"을 누르면 실제로 보낼 값을 보여 준다 (DB에는 쓰지 않음) */
export function PhotoUploadCheck({ userId }: { userId: string }) {
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [submitted, setSubmitted] = useState<{ body: string; photoPath: string | null } | null>(null);

  return (
    <form
      className="flex flex-col gap-md"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted({ body, photoPath: photo?.path ?? null });
      }}
    >
      <div className="flex flex-col gap-xs">
        <label htmlFor="check-body" className="text-body-sm text-text-secondary">
          글 (사진 올리기가 실패해도 남는지 확인)
        </label>
        <textarea
          id="check-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border-default bg-surface px-md py-sm text-body-long text-text-primary outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong focus:ring-inset"
        />
      </div>

      <PhotoPicker bucket="review-photos" userId={userId} name="photo_path" onChange={setPhoto} />

      {photo ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-xxs text-body-sm text-text-secondary" data-testid="photo-result">
          <dt>원래 사진</dt>
          <dd>
            {formatSize(photo.originalSize)} · {photo.originalType}
          </dd>
          <dt>올린 사진</dt>
          <dd data-testid="uploaded-size" data-bytes={photo.size}>
            {formatSize(photo.size)} · {photo.type}
          </dd>
        </dl>
      ) : null}

      <Button type="submit" className="w-full">
        제출 확인
      </Button>

      {submitted ? (
        <p role="status" className="text-body-md text-text-primary" data-testid="submitted">
          글 {submitted.body.length}자 · 사진 {submitted.photoPath ? "있음" : "없음"}
        </p>
      ) : null}
    </form>
  );
}
