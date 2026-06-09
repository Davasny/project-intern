type CreateOpencodeAuthHeaderParams = {
  password: string
  username: string
}

export const createOpencodeAuthHeader = ({
  password,
  username,
}: CreateOpencodeAuthHeaderParams) => {
  const credentials = Buffer.from(`${username}:${password}`).toString("base64")

  return `Basic ${credentials}`
}
