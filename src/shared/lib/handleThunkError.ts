import { validateResErrors } from "@shared/lib/tools/validateResErrors";

type RejectWithValue = (value: unknown) => unknown;

export const handleThunkError = (
  error: unknown,
  rejectWithValue: RejectWithValue,
) => {
  const err = error as { message?: string } | null | undefined;
  const message = validateResErrors(
    error,
    err?.message || "Неизвестная ошибка",
  );
  return rejectWithValue(message);
};
