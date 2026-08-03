import { createAsyncThunk } from "@reduxjs/toolkit";

/** Stub: manufacture transfers not used in nur-market */
export const fetchTransfersAsync = createAsyncThunk(
  "transfers/fetchAll",
  async () => [],
);
