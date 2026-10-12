export function findLeadOnBoard(board: any, leadId: any) {
  if (!board) return null;
  for (const col of board.columns || []) {
    const found = (col.leads || []).find((l: any) => l.id === leadId);
    if (found) return found;
  }
  return (board.unassigned || []).find((l: any) => l.id === leadId) || null;
}

export function pluckLeadFromBoard(board: any, leadId: any) {
  if (!board) return { board, lead: null };
  const next = {
    ...board,
    columns: (board.columns || []).map((col: any) => ({
      ...col,
      leads: [...(col.leads || [])],
    })),
    unassigned: [...(board.unassigned || [])],
  };

  let removed: any = null;
  for (const col of next.columns) {
    const i = col.leads.findIndex((l: any) => l.id === leadId);
    if (i !== -1) {
      removed = col.leads.splice(i, 1)[0];
      return { board: next, lead: removed };
    }
  }
  const j = next.unassigned.findIndex((l: any) => l.id === leadId);
  if (j !== -1) removed = next.unassigned.splice(j, 1)[0];
  return { board: next, lead: removed };
}

export function placeLeadOnBoard(board: any, lead: any) {
  if (!board || !lead) return board;
  const next = {
    ...board,
    columns: (board.columns || []).map((col: any) => ({
      ...col,
      leads: [...(col.leads || [])],
    })),
    unassigned: [...(board.unassigned || [])],
  };

  const stageId = lead.stage;
  if (!stageId) {
    next.unassigned = [lead, ...next.unassigned];
    return next;
  }
  const col = next.columns.find((c: any) => c.stage?.id === stageId);
  if (col) {
    col.leads = [lead, ...col.leads];
  } else {
    next.unassigned = [lead, ...next.unassigned];
  }
  return next;
}

export function moveLeadOnBoard(board: any, leadId: any, toStageId: any) {
  const { board: without, lead } = pluckLeadFromBoard(board, leadId);
  if (!lead) return board;
  return placeLeadOnBoard(without, { ...lead, stage: toStageId || null });
}

export function upsertLeadOnBoard(board: any, lead: any) {
  if (!board || !lead) return board;
  const existing = findLeadOnBoard(board, lead.id);
  // Частичный WS-апдейт (status → in_work) без stage/funnel — мержим с карточкой
  const merged = existing ? { ...existing, ...lead } : lead;
  if (existing) {
    if (lead.stage === undefined || lead.stage === null) {
      merged.stage = existing.stage;
    }
    if (lead.funnel === undefined || lead.funnel === null) {
      merged.funnel = existing.funnel;
    }
  }
  const { board: without } = pluckLeadFromBoard(board, lead.id);
  return placeLeadOnBoard(without, merged);
}

export function removeLeadFromBoard(board: any, leadId: any) {
  const { board: next } = pluckLeadFromBoard(board, leadId);
  return next;
}
