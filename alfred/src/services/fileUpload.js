// services/uploadFile.js

export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append("file", file.raw) // file.raw is the actual File object

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent) // fires repeatedly as chunks go out
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Network error")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))

    xhr.open("POST", "http://localhost:8000/upload") // your FastAPI endpoint
    xhr.send(formData)
  })
}