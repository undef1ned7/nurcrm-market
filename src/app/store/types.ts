import type store from "./index.js";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
