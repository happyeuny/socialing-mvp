import { z } from "zod";

// 후기 쓰기 P09 입력 (spec M9, 6장, 8.6). 폼과 서버 액션이 같은 규칙을 쓴다.
// 글자 수는 앞뒤 공백·줄바꿈을 뺀 글자 수다. DB 함수 create_review도 같은 기준으로 센다.

export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 500;

/** 비공개 확인 질문 3개 (spec 6장). 순서와 칸 이름은 review_checks와 같다 */
export const REVIEW_QUESTIONS = [
  { key: "membersMatch", label: "① 참가자 구성이 소개와 같았나요?" },
  { key: "extraMoney", label: "② 앱에 적힌 금액 외에 돈을 요구받았나요?" },
  { key: "contentMatch", label: "③ 진행 내용이 소개와 같았나요?" },
] as const;

export type ReviewQuestionKey = (typeof REVIEW_QUESTIONS)[number]["key"];
export type ReviewAnswers = Record<ReviewQuestionKey, boolean | null>;

/** 앞뒤 공백·줄바꿈을 뺀 글자 수 (이모지도 한 글자) */
export function reviewBodyLength(body: string): number {
  return Array.from(body.trim()).length;
}

/** "후기 올리기" 위 한 줄: 먼저 걸리는 이유 하나. 모두 되면 null (spec 8.6 P09) */
export function reviewBlockedReason(body: string, answers: ReviewAnswers): string | null {
  const length = reviewBodyLength(body);
  if (length < REVIEW_BODY_MIN) return `후기를 ${REVIEW_BODY_MIN}자 이상 써 주세요`;
  if (length > REVIEW_BODY_MAX) return `후기는 ${REVIEW_BODY_MAX}자까지 쓸 수 있어요`;
  if (Object.values(answers).some((answer) => answer === null)) return "세 질문에 모두 답하면 올릴 수 있어요";
  return null;
}

// 사진 경로: `<사용자 id>/<파일 id>.jpg|png|webp` (photo-picker가 만든 모양). 내 폴더인지는 DB 함수가 확인한다
const PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const reviewSchema = z.object({
  socialingId: z.number().int().positive(),
  body: z.string().refine((body) => {
    const length = reviewBodyLength(body);
    return length >= REVIEW_BODY_MIN && length <= REVIEW_BODY_MAX;
  }),
  photoPath: z.string().regex(PHOTO_PATH).nullable(),
  membersMatch: z.boolean(),
  extraMoney: z.boolean(),
  contentMatch: z.boolean(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
