import { z } from "zod";
import { seoulInputToIso } from "@/lib/format";

// 소셜링 등록(P07)·수정(P08) 입력 (spec M8, 6장, 8.6 P07·P08). 폼과 서버 액션이 같은 규칙을 쓴다.
// DB 함수 create_socialing_v2·update_socialing_v2도 같은 범위를 다시 확인한다.
// 글자 수는 앞뒤 공백·줄바꿈을 뺀 글자 수다. 일시는 `datetime-local` 값(한국 시간, 분까지)으로 주고받는다.

export const SOCIALING_LIMITS = {
  titleMax: 40,
  descriptionMin: 20,
  descriptionMax: 1000,
  criteriaMax: 200,
  feeNoteMax: 100,
  ageMin: 1,
  ageMax: 99,
  materialUrlMax: 500,
  placeNameMax: 40,
  feeMax: 1_000_000,
  capacityMin: 2,
  capacityMax: 20,
  staffMax: 20,
} as const;

/** 양식 값. 숫자 칸도 입력 그대로(숫자 글자만) 문자열로 둔다 */
export type SocialingFormValues = {
  title: string;
  description: string;
  /** 자료 링크 (선택, SH3) */
  materialUrl: string;
  /** 카테고리 id, 안 골랐으면 "" */
  categoryId: string;
  hasAlcohol: "no" | "yes";
  placeKind: "branch" | "region";
  /** 스터디지점 venue id */
  branchId: string;
  /** 시·도 이름 (시·군·구를 고르기 위한 단계) */
  sido: string;
  /** 시·군·구 법정동코드 5자리 */
  regionCode: string;
  placeName: string;
  /** `2026-10-24T19:30` (한국 시간) */
  startsAt: string;
  applyDeadlineAt: string;
  fee: string;
  /** 참가비 설명 (유료면 필수, U3) */
  feeNote: string;
  capacity: string;
  staffCount: string;
  joinType: "first_come" | "approval";
  approvalCriteria: string;
  /** 연령 조건 (호스트 승인일 때만, SH1b): 제한 없음 · 나이 정하기 */
  ageLimit: "none" | "range";
  /** 만 나이, 숫자 글자만. 하나만 써도 된다 */
  minAge: string;
  maxAge: string;
};

export type SocialingField = keyof SocialingFormValues;
export type SocialingFieldErrors = Partial<Record<SocialingField, string>>;

/** 빈 양식 (screen-cases P07-01): 술 없음, 선착순, 스태프 0명, 연령 제한 없음 */
export const EMPTY_SOCIALING_FORM: SocialingFormValues = {
  title: "",
  description: "",
  materialUrl: "",
  categoryId: "",
  hasAlcohol: "no",
  placeKind: "branch",
  branchId: "",
  sido: "",
  regionCode: "",
  placeName: "",
  startsAt: "",
  applyDeadlineAt: "",
  fee: "",
  feeNote: "",
  capacity: "",
  staffCount: "0",
  joinType: "first_come",
  approvalCriteria: "",
  ageLimit: "none",
  minAge: "",
  maxAge: "",
};

/** 화면 순서. 제출하면 이 순서로 첫 오류 칸에 간다 */
export const SOCIALING_FIELD_ORDER: readonly SocialingField[] = [
  "title",
  "categoryId",
  "description",
  "materialUrl",
  "branchId",
  "sido",
  "regionCode",
  "placeName",
  "startsAt",
  "applyDeadlineAt",
  "fee",
  "feeNote",
  "capacity",
  "staffCount",
  "joinType",
  "approvalCriteria",
  "minAge",
  "maxAge",
];

/** 앞뒤 공백·줄바꿈을 뺀 글자 수 (이모지도 한 글자) */
export function textLength(value: string): number {
  return Array.from(value.trim()).length;
}

/** 수정(P08)에서만 쓰는 조건 */
export type SocialingFormContext = {
  /** 지금 시각(ms). 소셜링 일시는 지금 이후 */
  now: number;
  /** 수정 전 소셜링 일시(`datetime-local` 값). 같으면 지금 이후인지 보지 않는다 */
  originalStartsAt?: string;
  /** 참여 확정 인원. 정원은 이보다 적을 수 없다 */
  acceptedCount?: number;
};

const DIGITS = /^\d{1,7}$/;

/**
 * 자료 링크: `https://`로 시작하는 주소 (SH3, 03 8.3). 사이트 이름에 점이 있고 공백이 없다.
 * DB 함수(private.check_socialing_extra)의 정규식과 같다.
 */
export const MATERIAL_URL = /^https:\/\/[^\s/?#@]+\.[^\s/?#@]+([/?#]\S*)?$/;

function numberOf(value: string): number | null {
  return DIGITS.test(value) ? Number(value) : null;
}

/** 칸마다 첫 오류 하나 (spec 8.6 P07·P08) */
export function socialingFieldErrors(values: SocialingFormValues, context: SocialingFormContext): SocialingFieldErrors {
  const errors: SocialingFieldErrors = {};
  const L = SOCIALING_LIMITS;

  const titleLength = textLength(values.title);
  if (titleLength === 0) errors.title = "제목을 입력해 주세요";
  else if (titleLength > L.titleMax) errors.title = `제목은 ${L.titleMax}자까지 쓸 수 있어요`;

  if (!values.categoryId) errors.categoryId = "카테고리를 골라 주세요";

  const descriptionLength = textLength(values.description);
  if (descriptionLength < L.descriptionMin) errors.description = `소개를 ${L.descriptionMin}자 이상 써 주세요`;
  else if (descriptionLength > L.descriptionMax) errors.description = `소개는 ${L.descriptionMax}자까지 쓸 수 있어요`;

  if (values.placeKind === "branch") {
    if (!values.branchId) errors.branchId = "스터디지점을 골라 주세요";
  } else {
    if (!values.sido) errors.sido = "시·도를 골라 주세요";
    else if (!values.regionCode) errors.regionCode = "시·군·구를 골라 주세요";
    const placeNameLength = textLength(values.placeName);
    if (placeNameLength === 0) errors.placeName = "장소 이름을 입력해 주세요";
    else if (placeNameLength > L.placeNameMax) errors.placeName = `장소 이름은 ${L.placeNameMax}자까지 쓸 수 있어요`;
  }

  const startsAt = seoulInputToIso(values.startsAt);
  const startsAtChanged = context.originalStartsAt === undefined || values.startsAt !== context.originalStartsAt;
  if (!startsAt) errors.startsAt = "소셜링 일시를 골라 주세요";
  else if (startsAtChanged && Date.parse(startsAt) <= context.now) errors.startsAt = "소셜링 일시는 지금 이후여야 해요";

  const deadline = seoulInputToIso(values.applyDeadlineAt);
  if (!deadline) errors.applyDeadlineAt = "신청 마감 일시를 골라 주세요";
  else if (startsAt && Date.parse(deadline) > Date.parse(startsAt)) {
    errors.applyDeadlineAt = "신청 마감 일시는 소셜링 일시와 같거나 앞이어야 해요";
  }

  const fee = numberOf(values.fee);
  if (values.fee === "") errors.fee = "총 참가비를 입력해 주세요 (무료면 0)";
  else if (fee === null || fee > L.feeMax) errors.fee = `총 참가비는 0~${L.feeMax.toLocaleString("ko-KR")}원이에요`;

  const capacity = numberOf(values.capacity);
  if (capacity === null || capacity < L.capacityMin || capacity > L.capacityMax) {
    errors.capacity = `정원은 ${L.capacityMin}~${L.capacityMax}명이에요`;
  } else if (context.acceptedCount !== undefined && capacity < context.acceptedCount) {
    errors.capacity = `참여 확정 인원(${context.acceptedCount}명)보다 적게 할 수 없어요`;
  }

  const staff = numberOf(values.staffCount);
  if (staff === null || staff > L.staffMax) errors.staffCount = `스태프 인원은 0~${L.staffMax}명이에요`;

  const materialUrl = values.materialUrl.trim();
  if (materialUrl && (textLength(materialUrl) > L.materialUrlMax || !MATERIAL_URL.test(materialUrl))) {
    errors.materialUrl = "https://로 시작하는 주소를 넣어 주세요";
  }

  // 참가비 설명: 유료면 필수, 무료면 선택 (U3)
  const feeNoteLength = textLength(values.feeNote);
  if (feeNoteLength > L.feeNoteMax) errors.feeNote = `참가비 설명은 ${L.feeNoteMax}자까지 쓸 수 있어요`;
  else if (feeNoteLength === 0 && fee !== null && fee > 0) errors.feeNote = "참가비 설명을 입력해 주세요";

  if (values.joinType === "approval") {
    // 승인 기준: 호스트 승인이면 필수 (U5)
    const criteriaLength = textLength(values.approvalCriteria);
    if (criteriaLength === 0) errors.approvalCriteria = "승인 기준을 입력해 주세요";
    else if (criteriaLength > L.criteriaMax) errors.approvalCriteria = `승인 기준은 ${L.criteriaMax}자까지 쓸 수 있어요`;

    // 연령 조건: 나이 정하기면 하나 이상, 1~99세, 최소 ≤ 최대 (SH1b)
    if (values.ageLimit === "range") {
      const minAge = values.minAge === "" ? null : numberOf(values.minAge);
      const maxAge = values.maxAge === "" ? null : numberOf(values.maxAge);
      const outOfRange = (age: number | null, raw: string) =>
        raw !== "" && (age === null || age < L.ageMin || age > L.ageMax);
      const ageRangeError = `나이는 ${L.ageMin}~${L.ageMax}세예요`;
      if (values.minAge === "" && values.maxAge === "") {
        errors.minAge = "최소 나이나 최대 나이를 하나 이상 입력해 주세요";
      } else if (outOfRange(minAge, values.minAge) || outOfRange(maxAge, values.maxAge)) {
        if (outOfRange(minAge, values.minAge)) errors.minAge = ageRangeError;
        if (outOfRange(maxAge, values.maxAge)) errors.maxAge = ageRangeError;
      } else if (minAge !== null && maxAge !== null && minAge > maxAge) {
        errors.minAge = "최소 나이가 최대 나이보다 클 수 없어요";
      }
    }
  }

  return errors;
}

const formShape = z.object({
  title: z.string(),
  description: z.string(),
  materialUrl: z.string(),
  categoryId: z.string(),
  hasAlcohol: z.enum(["no", "yes"]),
  placeKind: z.enum(["branch", "region"]),
  branchId: z.string(),
  sido: z.string(),
  regionCode: z.string(),
  placeName: z.string(),
  startsAt: z.string(),
  applyDeadlineAt: z.string(),
  fee: z.string(),
  feeNote: z.string(),
  capacity: z.string(),
  staffCount: z.string(),
  joinType: z.enum(["first_come", "approval"]),
  approvalCriteria: z.string(),
  ageLimit: z.enum(["none", "range"]),
  minAge: z.string(),
  maxAge: z.string(),
});

/** 폼과 서버 액션이 같이 쓰는 검사. 모양이 틀리면(조작된 요청) 칸 오류 없이 실패 */
export function socialingFormSchema(context: SocialingFormContext) {
  return formShape.superRefine((values, ctx) => {
    for (const [field, message] of Object.entries(socialingFieldErrors(values, context))) {
      ctx.addIssue({ code: "custom", path: [field], message });
    }
  });
}

/** zod 결과 → 칸 오류 (칸마다 첫 문구) */
export function fieldErrorsOf(error: z.ZodError): SocialingFieldErrors {
  const errors: SocialingFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as SocialingField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** 검사를 통과한 양식 → DB 함수 인자 (create_socialing_v2 · update_socialing_v2 공통) */
export function socialingArgs(values: SocialingFormValues, coverPhotoPath: string | null) {
  const branch = values.placeKind === "branch";
  // 연령 조건은 호스트 승인 + 나이 정하기일 때만 보낸다. 선착순으로 바꾸면 지워진다 (03 6.2)
  const ages = values.joinType === "approval" && values.ageLimit === "range";
  return {
    p_title: values.title.trim(),
    p_description: values.description.trim(),
    p_category_id: Number(values.categoryId),
    p_has_alcohol: values.hasAlcohol === "yes",
    p_branch_id: branch ? Number(values.branchId) : null,
    p_region_code: branch ? null : values.regionCode,
    p_place_name: branch ? null : values.placeName.trim(),
    p_starts_at: seoulInputToIso(values.startsAt)!,
    p_apply_deadline_at: seoulInputToIso(values.applyDeadlineAt)!,
    p_fee: Number(values.fee),
    p_capacity: Number(values.capacity),
    p_staff_count: Number(values.staffCount),
    p_join_type: values.joinType,
    p_approval_criteria: values.joinType === "approval" ? values.approvalCriteria.trim() || null : null,
    p_cover_photo_path: coverPhotoPath,
    p_fee_note: values.feeNote.trim() || null,
    p_min_age: ages && values.minAge !== "" ? Number(values.minAge) : null,
    p_max_age: ages && values.maxAge !== "" ? Number(values.maxAge) : null,
    p_material_url: values.materialUrl.trim() || null,
  };
}

// 사진 경로: `<사용자 id>/<파일 id>.jpg|png|webp` (photo-picker가 만든 모양). 내 폴더인지는 DB 함수가 확인한다
export const COVER_PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
