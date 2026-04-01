export const readBrowserFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error("File could not be read."))
    }

    reader.onload = () => {
      const result = reader.result

      if (typeof result !== "string") {
        reject(new Error("File payload could not be encoded."))
        return
      }

      const [, base64Payload = ""] = result.split(",")
      resolve(base64Payload)
    }

    reader.readAsDataURL(file)
  })
