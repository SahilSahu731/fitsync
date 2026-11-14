// IDs come exclusively from requireAuth's verified JWT, never request bodies.
export function exerciseVisibility(ownerId?: string) {
  return ownerId ? `owner_user_id.is.null,owner_user_id.eq.${ownerId}` : "owner_user_id.is.null";
}
