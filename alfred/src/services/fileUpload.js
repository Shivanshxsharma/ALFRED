import {user_contextStore} from "./contextStrore"
export function uploadFile(file, onProgress) {

  const user_id = user_contextStore.getState().user_id;
 
 console.log("Uploading file for user:", user_id);

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append("file", file.raw) 
    formData.append("user_id", user_id)
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent) 
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText)
        resolve(res)
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Network error")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))

    xhr.open("POST", "http://localhost:8000/upload") // your FastAPI endpoint
    xhr.send(formData) // send user_id as part of the request
  })
}