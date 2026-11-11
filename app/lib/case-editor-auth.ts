/** Sites dispatch supplies verified identity headers; never accept caller IDs in JSON. */
export function editorContext(request: Request, configuredUserId: string | undefined) {
  const callerId = request.headers.get("oai-authenticated-user-id");
  const verifiedEmail = request.headers.get("oai-authenticated-user-email");
  return {
    callerId: callerId && verifiedEmail ? callerId : null,
    configured: Boolean(configuredUserId),
    canWrite: Boolean(configuredUserId && callerId && verifiedEmail && callerId === configuredUserId),
  };
}

export function requireCaseEditor(request: Request, configuredUserId: string | undefined) {
  const context = editorContext(request, configuredUserId);
  if (!context.canWrite) throw new Error("Redaktionel adgang kræver den konfigurerede ejeridentitet. Offentlige besøgende kan ikke ændre sager.");
  return context.callerId!;
}
