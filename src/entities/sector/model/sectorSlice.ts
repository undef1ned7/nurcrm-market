import { createSlice } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import { mapSectorNameToSlug } from "@shared/lib/sectorMapping";

const persistSelectedSector = (value: any) => {
  if (value) localStorage.setItem("selectedSector", value);
  else localStorage.removeItem("selectedSector");
};

const initialState: any = {
  selected: localStorage.getItem("selectedSector") || null,
};

const sectorSlice = createSlice({
  name: "sector",
  initialState,
  reducers: {
    setSector(state, action: any) {
      state.selected = action.payload || null;
      persistSelectedSector(state.selected);
    },
    resetSector(state) {
      state.selected = null;
      persistSelectedSector(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("user/fetchCompany/fulfilled" as any, (state, action: any) => {
        const slug = mapSectorNameToSlug(action.payload?.sector?.name);
        if (slug) {
          state.selected = slug;
          persistSelectedSector(slug);
        }
      })
      .addCase("user/logoutUser" as any, (state) => {
        state.selected = null;
        persistSelectedSector(null);
      });
  },
});

export const { setSector, resetSector } = sectorSlice.actions;
export const useSector = () => useSelector((state: any) => state.sector);
export const selectSectorSelected = (state: any) => state.sector.selected;
export default sectorSlice.reducer;
