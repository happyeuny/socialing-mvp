"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/button";
import { PhotoPicker } from "@/components/photo-picker";
import { QuestionBlock } from "@/components/question-block";
import { Textarea } from "@/components/textarea";
import { showToast } from "@/components/toast";
import { createReview, type CreateReviewResult } from "@/lib/actions/reviews";
import { withNotice } from "@/lib/notices";
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_QUESTIONS,
  reviewBlockedReason,
  reviewBodyLength,
  type ReviewAnswers,
} from "@/lib/validation/review";

// 후기 쓰기(P09) 입력 (spec M9, 8.6, 8.7): 글 → 사진 → 비공개 확인 질문 3개, 아래 고정 영역에 이유 한 줄과 "후기 올리기".
// 글과 질문 답은 올리기 전까지 이 브라우저에 계정·소셜링별로 임시 저장한다(사진 제외). 다시 오면 채우고, 올리면 지운다.

const EMPTY_ANSWERS: ReviewAnswers = { membersMatch: null, extraMoney: null, contentMatch: null };

type Draft = { body: string; answers: ReviewAnswers };

function readDraft(key: string): Draft | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const { body, answers } = value as Partial<Draft>;
    if (typeof body !== "string" || typeof answers !== "object" || answers === null) return null;
    const restored = { ...EMPTY_ANSWERS };
    for (const { key: question } of REVIEW_QUESTIONS) {
      const answer = answers[question];
      if (typeof answer === "boolean") restored[question] = answer;
    }
    return { body, answers: restored };
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft) {
  try {
    const empty = draft.body === "" && Object.values(draft.answers).every((answer) => answer === null);
    if (empty) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)는 임시 저장 없이 쓴다
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/** 글자 수 표시: "120 / 500 · 10자 이상", 500자를 넘으면 "520 / 500" (DESIGN textarea) */
function counterText(length: number) {
  return length > REVIEW_BODY_MAX
    ? `${length} / ${REVIEW_BODY_MAX}`
    : `${length} / ${REVIEW_BODY_MAX} · ${REVIEW_BODY_MIN}자 이상`;
}

const REASON_ID = "review-submit-reason";

type ReviewFormProps = {
  socialingId: number;
  userId: string;
  /** 맨 위 소셜링 요약 카드 (서버에서 그린다) */
  summary: React.ReactNode;
};

const subscribeNothing = () => () => {};

export function ReviewForm(props: ReviewFormProps) {
  const draftKey = `review-draft:${props.userId}:${props.socialingId}`;
  // 브라우저 저장소는 서버에서 읽을 수 없어, 서버와 첫 화면은 빈 양식으로 그리고
  // 브라우저에서는 임시 저장을 채운 양식으로 바꿔 그린다(key가 바뀌어 새로 만든다)
  const inBrowser = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return (
    <ReviewFormFields
      key={inBrowser ? "browser" : "server"}
      {...props}
      draftKey={draftKey}
      initialDraft={inBrowser ? readDraft(draftKey) : null}
      saveDraft={inBrowser}
    />
  );
}

function ReviewFormFields({
  socialingId,
  userId,
  summary,
  draftKey,
  initialDraft,
  saveDraft,
}: ReviewFormProps & { draftKey: string; initialDraft: Draft | null; saveDraft: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [answers, setAnswers] = useState<ReviewAnswers>(initialDraft?.answers ?? EMPTY_ANSWERS);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [retry, setRetry] = useState(false);
  // 올린 뒤 다음 화면으로 옮겨 가는 동안에도 잠가 두고, 임시 저장도 더 하지 않는다
  const [leaving, setLeaving] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (saveDraft && !leaving) writeDraft(draftKey, { body, answers });
  }, [draftKey, saveDraft, leaving, body, answers]);

  const length = reviewBodyLength(body);
  const lengthInvalid = (length > 0 && length < REVIEW_BODY_MIN) || length > REVIEW_BODY_MAX;
  const blockedReason = reviewBlockedReason(body, answers) ?? (uploading ? "사진을 올리는 중이에요" : null);
  // 올리기 실패 문구는 다시 누를 수 있을 때만. 그 사이 글을 고쳐 막히면 이유가 그 자리를 쓴다
  const showRetry = retry && !pending && blockedReason === null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blockedReason || pending || leaving) return;
    const { membersMatch, extraMoney, contentMatch } = answers;
    if (membersMatch === null || extraMoney === null || contentMatch === null) return;

    startTransition(async () => {
      let result: CreateReviewResult | undefined;
      try {
        result = await createReview({ socialingId, body, photoPath, membersMatch, extraMoney, contentMatch });
      } catch {
        setRetry(true);
        return;
      }
      // 로그인 화면으로 보낸 경우. 글은 임시 저장돼 있어 돌아오면 채워진다
      if (!result) return;

      if (result.ok) {
        setLeaving(true);
        clearDraft(draftKey);
        showToast({ message: "후기를 올렸어요" });
        router.replace("/reviews");
      } else if ("notice" in result) {
        // 쓰는 사이 조건이 안 맞게 됨 → 상세 + 이유 (spec 8.7). 이미 썼으면 임시 저장도 필요 없다
        setLeaving(true);
        if (result.notice === "review-done") clearDraft(draftKey);
        router.replace(withNotice(`/socialings/${socialingId}`, result.notice));
      } else {
        setRetry(true);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-[calc(100dvh-56px)] flex-col">
      <div className="flex flex-1 flex-col gap-xl px-page-x pt-lg pb-2xl">
        {summary}

        <Textarea
          name="body"
          label="후기"
          placeholder="어떤 시간이었는지 다음 참여자에게 알려 주세요"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          counter={counterText(length)}
          invalid={lengthInvalid}
        />

        <div className="flex flex-col gap-xs">
          <p className="text-title-md text-text-primary">
            사진 <span className="text-body-sm text-text-secondary">선택 · 1장</span>
          </p>
          <PhotoPicker
            bucket="review-photos"
            userId={userId}
            onChange={(photo) => setPhotoPath(photo?.path ?? null)}
            onUploadingChange={setUploading}
          />
          <p className="text-body-sm text-text-secondary">사진을 올리지 못해도 쓴 글은 그대로 남아요</p>
        </div>

        <section aria-labelledby="private-questions" className="flex flex-col gap-lg rounded-xl bg-surface-muted p-lg">
          <div className="flex flex-col gap-xxs">
            <h2 id="private-questions" className="flex items-center gap-xs text-title-md text-text-primary">
              <Lock className="size-5 shrink-0" aria-hidden />
              비공개 확인 질문
            </h2>
            <p className="text-body-sm break-keep text-text-secondary">
              개별 응답은 호스트를 포함해 누구에게도 보이지 않아요. 합계만 호스트 기록에 쓰여요.
            </p>
          </div>
          {REVIEW_QUESTIONS.map((question) => (
            <QuestionBlock
              key={question.key}
              name={question.key}
              question={question.label}
              value={answers[question.key]}
              onChange={(value) => setAnswers((current) => ({ ...current, [question.key]: value }))}
            />
          ))}
        </section>
      </div>

      <div
        data-toast-anchor
        className="sticky bottom-0 z-10 flex flex-col items-center gap-xs border-t border-border-default bg-surface px-md pt-sm pb-[calc(12px+env(safe-area-inset-bottom))] shadow-up"
      >
        {showRetry ? (
          <p role="alert" className="text-center text-body-sm break-keep text-danger">
            후기를 올리지 못했어요. 연결을 확인하고 다시 시도해 주세요
          </p>
        ) : (
          <p id={REASON_ID} className="text-center text-body-sm break-keep text-text-secondary">
            {blockedReason ?? "올리면 바로 공개돼요"}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={blockedReason !== null}
          loading={pending || leaving}
          aria-describedby={showRetry ? undefined : REASON_ID}
        >
          {showRetry ? "다시 시도" : "후기 올리기"}
        </Button>
      </div>
    </form>
  );
}
