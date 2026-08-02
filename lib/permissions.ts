export type ContentVisibility = "draft" | "private" | "members" | "public"

/** Account-level features available to every signed-in account, including Free. */
export function canUseUserFeatures(userId: string | null | undefined): boolean {
  return Boolean(userId)
}

/** `members` means every signed-in account; it is no longer a paid-plan boundary. */
export function canViewMembersContent(userId: string | null | undefined): boolean {
  return Boolean(userId)
}

export function getVisibleContentStatuses({
  viewerId,
  ownerId,
}: {
  viewerId: string | null | undefined
  ownerId?: string | null
}): ContentVisibility[] {
  if (viewerId && ownerId && viewerId === ownerId) {
    return ["private", "members", "public"]
  }
  return viewerId ? ["members", "public"] : ["public"]
}

export function canViewContent({
  visibility,
  viewerId,
  ownerId,
}: {
  visibility: string | null | undefined
  viewerId: string | null | undefined
  ownerId?: string | null
}): boolean {
  const normalized = (visibility || "public") as ContentVisibility
  const isOwner = Boolean(viewerId && ownerId && viewerId === ownerId)

  if (normalized === "draft" || normalized === "private") return isOwner
  if (normalized === "members") return isOwner || canViewMembersContent(viewerId)
  return true
}
