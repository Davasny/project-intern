type BuildPersonalOrganizationNameParams = {
  isAnonymous: boolean
  userEmail: string
  userName: string
}

export const buildPersonalOrganizationName = ({
  isAnonymous,
  userEmail,
  userName,
}: BuildPersonalOrganizationNameParams) => {
  const trimmedUserName = userName.trim()

  if (trimmedUserName.length > 0) {
    return `${trimmedUserName}'s Organization`
  }

  if (isAnonymous) {
    return "Guest Organization"
  }

  const emailPrefix = userEmail.split("@")[0]?.trim() ?? "User"
  return `${emailPrefix}'s Organization`
}
