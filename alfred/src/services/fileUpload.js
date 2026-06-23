import { doRefresh, ensureFreshToken } from "./fetch_info"

export async function uploadFile(file, onProgress) {
  await ensureFreshToken()
  return _doUpload(file, onProgress, false)
}

function _doUpload(file, onProgress, isRetry) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append("file", file.raw)
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener("load", async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))

      } else if (xhr.status === 401 && !isRetry) {
        // Token expired mid-upload — refresh and retry once
        try {
          await doRefresh()
          const result = await _doUpload(file, onProgress, true)
          resolve(result)
        } catch {
          reject(new Error("Session expired — please log in again"))
        }

      } else if (xhr.status === 401 && isRetry) {
        // Refresh didn't help — actual auth failure
        reject(new Error("Session expired — please log in again"))

      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Network error")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))

    xhr.open("POST", `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/upload`)
    xhr.withCredentials = true
    xhr.send(formData)
  })
}