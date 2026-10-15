"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ApplyBarShell } from "@/components/apply-bar-shell";
import { Button } from "@/components/button";
import { ChoiceChip } from "@/components/choice-chip";
import { Dialog } from "@/components/dialog";
import { PhotoPicker } from "@/components/photo-picker";
import { SegmentedChoice } from "@/components/segmented";
import { SelectField } from "@/components/select-field";
import { FieldMessage, TextField, fieldLabelClass } from "@/components/text-field";
import { Textarea } from "@/components/textarea";
import { showToast } from "@/components/toast";
import {
  createSocialing,
  updateSocialing,
  type SaveSocialingResult,
  type UpdateSocialingResult,
} from "@/lib/actions/socialings";
import { focusFirstError } from "@/lib/focus-first-error";
import { shortSido } from "@/lib/format";
import type { SocialingFormCatalog } from "@/lib/queries/catalog";
import {
  EMPTY_SOCIALING_FORM,
  SOCIALING_FIELD_ORDER,
  SOCIALING_LIMITS,
  socialingFieldErrors,
  textLength,
  type SocialingField,
  type SocialingFieldErrors,
  type SocialingFormValues,
} from "@/lib/validation/socialing";

// 소셜링 등록(P07)·수정(P08) 양식 (spec M8, 8.6, 8.7, 시안 P07): 대표 사진 → 제목 → 카테고리 → 술 여부 → 소개 →
// 장소 → 소셜링 일시 → 신청 마감 일시 → 총 참가비 → 정원 → 스태프 인원 → 모집 방식 → 승인 기준(호스트 승인일 때만),
// 아래 고정 "소셜링 열기"(등록) · "저장하기"(수정). 제출하면 칸마다 이유를 보이고 첫 오류 칸으로 간다.
// 등록: 글 입력은 열기 전까지 이 브라우저에 계정별로 임시 저장한다(사진 제외). 다시 오면 채우고, 열면 지운다.
// 수정: 지금 값을 채운다. 참여 확정자가 있으면 일시·장소·참가비, 승인 대기 신청이 있으면 모집 방식이 잠긴다.
// 잠긴 칸은 언제나 지금 값을 보이고 그 값을 보낸다. 정원은 참여 확정 인원보다 적게 할 수 없다.

const L = SOCIALING_LIMITS;
const PHOTO_FAILED_NOTICE = "사진은 올리지 못했어요. 관리하기 → 수정에서 다시 올려 주세요";
const LOCKED_BY_ACCEPTED = "참여 확정자가 있어 바꿀 수 없어요";
const LOCKED_BY_PENDING = "승인 대기 신청이 있어 바꿀 수 없어요";

const ALCOHOL_OPTIONS = [
  { value: "no", label: "없음" },
  { value: "yes", label: "있음" },
] as const;
const PLACE_OPTIONS = [
  { value: "branch", label: "스터디지점" },
  { value: "region", label: "지역 (시·도 → 구)" },
] as const;
const JOIN_OPTIONS = [
  { value: "first_come", label: "선착순" },
  { value: "approval", label: "호스트 승인" },
] as const;

// 임시 저장 -------------------------------------------------------------------------------------------

const STRING_FIELDS = Object.keys(EMPTY_SOCIALING_FORM) as SocialingField[];
const ENUMS: Partial<Record<SocialingField, readonly string[]>> = {
  hasAlcohol: ["no", "yes"],
  placeKind: ["branch", "region"],
  joinType: ["first_come", "approval"],
};

function readDraft(key: string): SocialingFormValues | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const restored: Record<string, string> = { ...EMPTY_SOCIALING_FORM };
    for (const field of STRING_FIELDS) {
      const saved = (value as Record<string, unknown>)[field];
      if (typeof saved !== "string") continue;
      if (ENUMS[field] && !ENUMS[field].includes(saved)) continue;
      restored[field] = saved;
    }
    return restored as SocialingFormValues;
  } catch {
    return null;
  }
}

function isEmpty(values: SocialingFormValues) {
  return STRING_FIELDS.every((field) => values[field] === EMPTY_SOCIALING_FORM[field]);
}

function writeDraft(key: string, values: SocialingFormValues) {
  try {
    if (isEmpty(values)) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)는 임시 저장 없이 쓴다
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// 양식 ------------------------------------------------------------------------------------------------

type CommonProps = {
  userId: string;
  catalog: SocialingFormCatalog;
  /** 날짜·시간 고르기 칸의 가장 이른 값(지금, 한국 시간) */
  minDateTime: string;
};

/** 수정(P08)에만 있는 값 */
export type SocialingEditTarget = {
  socialingId: number;
  /** 지금 저장된 값 */
  original: SocialingFormValues;
  coverPhoto: { path: string; url: string } | null;
  acceptedCount: number;
  pendingCount: number;
};

export type SocialingFormProps = CommonProps & ({ mode: "create" } | ({ mode: "edit" } & SocialingEditTarget));

const subscribeNothing = () => () => {};

export function SocialingForm(props: SocialingFormProps) {
  if (props.mode === "edit") {
    return <SocialingFormFields {...props} edit={props} draftKey={null} initialValues={props.original} />;
  }
  return <CreateSocialingForm {...props} />;
}

function CreateSocialingForm(props: CommonProps) {
  const draftKey = `socialing-draft:${props.userId}`;
  // 브라우저 저장소는 서버에서 읽을 수 없어, 서버와 첫 화면은 빈 양식으로 그리고
  // 브라우저에서는 임시 저장을 채운 양식으로 바꿔 그린다(key가 바뀌어 새로 만든다)
  const inBrowser = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return (
    <SocialingFormFields
      key={inBrowser ? "browser" : "server"}
      {...props}
      edit={null}
      draftKey={inBrowser ? draftKey : null}
      initialValues={(inBrowser ? readDraft(draftKey) : null) ?? EMPTY_SOCIALING_FORM}
    />
  );
}

/** 숫자 칸: 숫자 글자만 남긴다 (음수·소수는 쓸 수 없다) */
function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

/** 총 참가비 칸 보이는 값: 15000 → "15,000" */
function feeDisplay(value: string) {
  return value === "" ? "" : Number(value).toLocaleString("ko-KR");
}

/** 잠긴 칸은 지금 저장된 값으로 (수정 P08) */
function withLockedValues(values: SocialingFormValues, edit: SocialingEditTarget | null): SocialingFormValues {
  if (!edit) return values;
  const { original } = edit;
  const next = { ...values };
  if (edit.acceptedCount > 0) {
    next.startsAt = original.startsAt;
    next.placeKind = original.placeKind;
    next.branchId = original.branchId;
    next.sido = original.sido;
    next.regionCode = original.regionCode;
    next.placeName = original.placeName;
    next.fee = original.fee;
  }
  if (edit.pendingCount > 0) next.joinType = original.joinType;
  return next;
}

/** 제출할 때 칸 검사. 수정은 소셜링 일시를 바꿀 때만 지금 이후, 정원은 참여 확정 인원 이상 */
function validate(values: SocialingFormValues, edit: SocialingEditTarget | null) {
  return socialingFieldErrors(values, {
    now: Date.now(),
    originalStartsAt: edit?.original.startsAt,
    acceptedCount: edit?.acceptedCount,
  });
}

/** 글자 수: "120 / 1000 · 20자 이상", 넘으면 "1020 / 1000" (DESIGN textarea) */
function counterText(length: number, max: number, min?: number) {
  return length > max || min === undefined ? `${length} / ${max}` : `${length} / ${max} · ${min}자 이상`;
}

function SocialingFormFields({
  userId,
  catalog,
  minDateTime,
  edit,
  draftKey,
  initialValues,
}: CommonProps & {
  edit: SocialingEditTarget | null;
  /** 임시 저장 키. null이면 저장하지 않는다(수정, 서버 첫 화면) */
  draftKey: string | null;
  initialValues: SocialingFormValues;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [typed, setValues] = useState(initialValues);
  // 그사이 참여 확정·승인 대기가 생겨 새로 고치면 잠긴 칸이 지금 값으로 바뀐다
  const values = withLockedValues(typed, edit);
  const [errors, setErrors] = useState<SocialingFieldErrors>({});
  const savedPhotoPath = edit?.coverPhoto?.path ?? null;
  const [photoPath, setPhotoPath] = useState<string | null>(savedPhotoPath);
  const [uploading, setUploading] = useState(false);
  /** 사진 올리기가 실패했고 그 뒤로 사진을 올리지 못했다 */
  const [photoFailed, setPhotoFailed] = useState(false);
  const [retry, setRetry] = useState(false);
  /** 수정: 그사이 잠금·정원 하한이 바뀌어 저장하지 못함 → 결과 창 */
  const [conflict, setConflict] = useState(false);
  // 연 뒤 상세로 옮겨 가는 동안에도 잠가 두고, 임시 저장도 더 하지 않는다
  const [leaving, setLeaving] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (draftKey && !leaving) writeDraft(draftKey, typed);
  }, [draftKey, leaving, typed]);

  const lockedByAccepted = edit && edit.acceptedCount > 0 ? LOCKED_BY_ACCEPTED : undefined;
  const lockedByPending = edit && edit.pendingCount > 0 ? LOCKED_BY_PENDING : undefined;

  /** 칸 값을 바꾸고 그 칸(과 함께 묶인 칸)의 오류를 지운다 */
  function change(patch: Partial<SocialingFormValues>, clear: SocialingField[] = []) {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of [...(Object.keys(patch) as SocialingField[]), ...clear]) delete next[field];
      return next;
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || leaving || uploading) return;
    const fieldErrors = validate(values, edit);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setRetry(false);
      focusFirstError(formRef.current, fieldErrors, SOCIALING_FIELD_ORDER);
      return;
    }

    startTransition(async () => {
      let result: SaveSocialingResult | UpdateSocialingResult | undefined;
      try {
        result = edit
          ? await updateSocialing(edit.socialingId, values, photoPath)
          : await createSocialing(values, photoPath);
      } catch {
        setRetry(true);
        return;
      }
      // 로그인 화면(또는 상세·관리)으로 보낸 경우. 등록 글은 임시 저장돼 있어 돌아오면 채워진다
      if (!result) return;

      if (result.ok && edit) {
        setLeaving(true);
        showToast({ message: "저장했어요" });
        router.replace(`/socialings/${edit.socialingId}/manage`);
      } else if (result.ok && "id" in result) {
        setLeaving(true);
        if (draftKey) clearDraft(draftKey);
        // 사진이 실패해 사진 없이 열었으면(실패 안내 그대로 또는 "사진 없이 열기") 수정에서 다시 올리라고 알린다
        // (spec 8.6 P07, screen-cases P07-13)
        showToast({ message: photoFailed && !photoPath ? PHOTO_FAILED_NOTICE : "소셜링을 열었어요" });
        // 상세에서 뒤로 가면 양식이 아니라 그 전 화면(내 소셜링)으로
        router.replace(`/socialings/${result.id}`);
      } else if ("fieldErrors" in result) {
        setErrors(result.fieldErrors);
        setRetry(false);
        focusFirstError(formRef.current, result.fieldErrors, SOCIALING_FIELD_ORDER);
      } else if ("conflict" in result) {
        setRetry(false);
        setConflict(true);
      } else {
        setRetry(true);
      }
    });
  }

  /** 결과 창 "확인": 지금 잠금·참여 확정 인원으로 다시 그린다 */
  function closeConflict() {
    setConflict(false);
    setErrors({});
    router.refresh();
  }

  const sidoOptions = [...new Set(catalog.regions.map((region) => region.sido))].map((sido) => ({
    value: sido,
    label: sido,
  }));
  const sigunguOptions = catalog.regions
    .filter((region) => region.sido === values.sido)
    .map((region) => ({ value: region.code, label: region.sigungu }));
  const branch = catalog.branches.find((item) => String(item.id) === values.branchId);
  const descriptionLength = textLength(values.description);
  const criteriaLength = textLength(values.approvalCriteria);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex min-h-[calc(100dvh-56px)] flex-col">
      <div className="flex flex-1 flex-col gap-xl px-page-x pt-lg pb-2xl">
        <div className="flex flex-col gap-xs">
          <p className="text-title-md text-text-primary">대표 사진 (선택) · 1장</p>
          <div className="flex flex-wrap items-start gap-md">
            <PhotoPicker
              bucket="socialing-photos"
              userId={userId}
              initialPhoto={edit?.coverPhoto}
              onChange={(photo) => {
                setPhotoPath(photo?.path ?? null);
                if (photo) setPhotoFailed(false);
              }}
              onUploadingChange={setUploading}
              onFailedChange={(failed) => {
                if (!failed) return;
                setPhotoFailed(true);
                // 수정에서 새 사진이 실패하면 저장된 사진을 그대로 둔다. "사진 없이 저장"을 누르면 지운다
                if (edit) setPhotoPath(savedPhotoPath);
              }}
              skipLabel={edit ? "사진 없이 저장" : "사진 없이 열기"}
            />
            <p className="min-w-40 flex-1 pt-xs text-body-sm break-keep text-text-secondary">
              {edit?.coverPhoto
                ? "지우고 다시 고르면 사진이 바뀌어요"
                : edit
                  ? "사진을 올리지 못해도 다른 내용은 저장돼요"
                  : "사진을 올리지 않아도 글은 그대로 남아요"}
            </p>
          </div>
        </div>

        <TextField
          name="title"
          label="제목"
          labelTone="form"
          placeholder="소셜링 제목을 입력해 주세요"
          value={values.title}
          onChange={(event) => change({ title: event.target.value })}
          error={errors.title}
          autoComplete="off"
        />

        <fieldset className="flex flex-col gap-xs">
          <legend id="label-category" className={`${fieldLabelClass("form")} mb-xs`}>
            카테고리
          </legend>
          <div
            role="radiogroup"
            aria-labelledby="label-category"
            aria-describedby={errors.categoryId ? "field-categoryId-error" : undefined}
            className="flex flex-wrap gap-xs"
          >
            {catalog.categories.map((category) => (
              <ChoiceChip
                key={category.id}
                name="categoryId"
                value={String(category.id)}
                label={category.name}
                checked={values.categoryId === String(category.id)}
                onCheckedChange={() => change({ categoryId: String(category.id) })}
              />
            ))}
          </div>
          <FieldMessage id="field-categoryId-error" error={errors.categoryId} />
        </fieldset>

        <div className="flex flex-col gap-xs">
          <p id="label-alcohol" className={fieldLabelClass("form")}>
            술 여부
          </p>
          <SegmentedChoice
            name="hasAlcohol"
            labelledBy="label-alcohol"
            options={ALCOHOL_OPTIONS}
            value={values.hasAlcohol}
            onChange={(hasAlcohol) => change({ hasAlcohol })}
          />
        </div>

        <div className="flex flex-col gap-xxs">
          <Textarea
            name="description"
            label="소개"
            labelTone="form"
            placeholder="어떤 활동을 하는지 자세히 소개해 주세요"
            value={values.description}
            onChange={(event) => change({ description: event.target.value })}
            counter={counterText(descriptionLength, L.descriptionMax, L.descriptionMin)}
            invalid={Boolean(errors.description) || descriptionLength > L.descriptionMax}
          />
          <FieldMessage id="field-description-error" error={errors.description} />
        </div>

        <div className="flex flex-col gap-sm">
          <p id="label-place" className={fieldLabelClass("form")}>
            장소
          </p>
          <SegmentedChoice
            name="placeKind"
            labelledBy="label-place"
            options={PLACE_OPTIONS}
            value={values.placeKind}
            onChange={(placeKind) => change({ placeKind }, ["branchId", "sido", "regionCode", "placeName"])}
            disabled={Boolean(lockedByAccepted)}
            describedBy={lockedByAccepted ? (values.placeKind === "branch" ? "field-branchId-helper" : "field-placeName-helper") : undefined}
          />
          {values.placeKind === "branch" ? (
            <SelectField
              name="branchId"
              label="스터디지점"
              placeholder="스터디지점을 골라 주세요"
              options={catalog.branches.map((item) => ({ value: String(item.id), label: item.name }))}
              value={values.branchId}
              onChange={(event) => change({ branchId: event.target.value })}
              error={errors.branchId}
              helper={branch ? `${shortSido(branch.sido)} ${branch.sigungu} 스터디지점` : undefined}
              locked={lockedByAccepted}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-xs">
                <SelectField
                  name="sido"
                  label="시·도"
                  placeholder="시·도"
                  options={sidoOptions}
                  value={values.sido}
                  onChange={(event) => change({ sido: event.target.value, regionCode: "" })}
                  error={errors.sido}
                  disabled={Boolean(lockedByAccepted)}
                />
                <SelectField
                  name="regionCode"
                  label="시·군·구"
                  placeholder="시·군·구"
                  options={sigunguOptions}
                  value={values.regionCode}
                  onChange={(event) => change({ regionCode: event.target.value })}
                  error={errors.regionCode}
                  disabled={values.sido === "" || Boolean(lockedByAccepted)}
                />
              </div>
              <TextField
                name="placeName"
                label="장소 이름"
                placeholder="예: 연남 작은책방 카페"
                value={values.placeName}
                onChange={(event) => change({ placeName: event.target.value })}
                error={errors.placeName}
                locked={lockedByAccepted}
                autoComplete="off"
              />
            </>
          )}
        </div>

        <TextField
          name="startsAt"
          label="소셜링 일시"
          labelTone="form"
          type="datetime-local"
          min={minDateTime}
          value={values.startsAt}
          onChange={(event) => change({ startsAt: event.target.value }, ["applyDeadlineAt"])}
          error={errors.startsAt}
          locked={lockedByAccepted}
        />

        <TextField
          name="applyDeadlineAt"
          label="신청 마감 일시"
          labelTone="form"
          type="datetime-local"
          // 수정에서는 이미 지난 마감 일시를 그대로 둘 수 있다
          min={edit ? undefined : minDateTime}
          value={values.applyDeadlineAt}
          onChange={(event) => change({ applyDeadlineAt: event.target.value })}
          error={errors.applyDeadlineAt}
          helper="소셜링 일시와 같거나 앞이어야 해요"
        />

        <TextField
          name="fee"
          label="총 참가비"
          labelTone="form"
          inputMode="numeric"
          placeholder="예: 15,000"
          suffix="원"
          value={feeDisplay(values.fee)}
          onChange={(event) => change({ fee: digitsOnly(event.target.value, 7) })}
          error={errors.fee}
          locked={lockedByAccepted}
          autoComplete="off"
        />

        <TextField
          name="capacity"
          label="정원"
          labelTone="form"
          inputMode="numeric"
          placeholder="예: 6"
          value={values.capacity}
          onChange={(event) => change({ capacity: digitsOnly(event.target.value, 2) })}
          error={errors.capacity}
          helper={
            edit && edit.acceptedCount > 0
              ? `${L.capacityMin}~${L.capacityMax}명 · 참여 확정 ${edit.acceptedCount}명보다 적게 할 수 없어요`
              : `${L.capacityMin}~${L.capacityMax}명`
          }
          autoComplete="off"
        />

        <TextField
          name="staffCount"
          label="스태프 인원"
          labelTone="form"
          inputMode="numeric"
          value={values.staffCount}
          onChange={(event) => change({ staffCount: digitsOnly(event.target.value, 2) })}
          error={errors.staffCount}
          helper="정원에 세지 않아요"
          autoComplete="off"
        />

        <div className="flex flex-col gap-xs">
          <p id="label-join-type" className={fieldLabelClass("form")}>
            모집 방식
          </p>
          <SegmentedChoice
            name="joinType"
            labelledBy="label-join-type"
            options={JOIN_OPTIONS}
            value={values.joinType}
            onChange={(joinType) => change({ joinType }, ["approvalCriteria"])}
            disabled={Boolean(lockedByPending)}
            describedBy={lockedByPending ? "field-joinType-helper" : undefined}
          />
          <FieldMessage id="field-joinType-helper" locked={lockedByPending} />
        </div>

        {values.joinType === "approval" ? (
          <div className="flex flex-col gap-xxs">
            <Textarea
              name="approvalCriteria"
              label="승인 기준 (선택)"
              labelTone="form"
              placeholder="함께할 참여자를 승인할 때 참고할 기준을 적어 주세요 (예: 책을 1장 이상 미리 읽어 올 수 있는 분이면 좋아요)"
              value={values.approvalCriteria}
              onChange={(event) => change({ approvalCriteria: event.target.value })}
              counter={counterText(criteriaLength, L.criteriaMax)}
              invalid={Boolean(errors.approvalCriteria) || criteriaLength > L.criteriaMax}
            />
            <FieldMessage id="field-approvalCriteria-error" error={errors.approvalCriteria} />
          </div>
        ) : null}
      </div>

      <ApplyBarShell>
        {retry && !pending ? (
          <p role="alert" className="text-center text-body-sm break-keep text-danger">
            {edit ? "저장하지 못했어요" : "소셜링을 열지 못했어요"}. 연결을 확인하고 다시 시도해 주세요
          </p>
        ) : uploading ? (
          <p className="text-center text-body-sm text-text-secondary">사진을 올리는 중이에요</p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={uploading} loading={pending || leaving}>
          {retry && !pending ? "다시 시도" : edit ? "저장하기" : "소셜링 열기"}
        </Button>
      </ApplyBarShell>

      <Dialog
        open={conflict}
        onOpenChange={(open) => (open ? undefined : closeConflict())}
        title="저장하지 못했어요"
        footer={
          <Button size="lg" className="flex-1" onClick={closeConflict}>
            확인
          </Button>
        }
      >
        그사이 참여 확정자나 승인 대기 신청이 생겨 바꿀 수 없는 칸이 있어요. 바뀐 내용을 확인하고 다시 저장해 주세요
      </Dialog>
    </form>
  );
}
