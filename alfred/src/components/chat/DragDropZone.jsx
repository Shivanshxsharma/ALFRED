"use client"
import * as React from "react"
import { usechatStore } from "@/services/contextStrore"
import { uploadFile } from "@/services/fileUpload"
import { v4 as uuidv4 } from "uuid"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { ErrorBanner, useErrorBanner } from "@/components/feedback/ErrorBanner"

export function DragDropZone({ children }) {
  const [dropMessage, setDropMessage] = React.useState(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragCounter = React.useRef(0)
  const MAX_SIZE = 10 * 1024 * 1024 


const FILE_TYPE_MAP = {
  pdf: "PDF", doc: "DOC", docx: "DOCX",
  xls: "XLS", xlsx: "XLSX",
  ppt: "PPT", pptx: "PPTX",
  txt: "TXT", csv: "CSV", json: "JSON", md: "MD",
  js: "JS", ts: "TS", jsx: "JSX", tsx: "TSX",
  html: "HTML", css: "CSS",
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"]

const ALLOWED_EXTENSIONS = new Set([
  ...Object.keys(FILE_TYPE_MAP),  
  ...IMAGE_EXTENSIONS              
])




const { error, showError } = useErrorBanner()

  React.useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault()
      dragCounter.current++
      setIsDragging(true)
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      dragCounter.current--
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }

    const handleDragOver = (e) => {
      e.preventDefault()
    }




const handleDrop = (e) => {
  e.preventDefault()
  dragCounter.current = 0

  const droppedFiles = Array.from(e.dataTransfer.files)
  const existingNames = new Set(usechatStore.getState().files_array.map(f => f.name))

  droppedFiles.forEach(rawFile => {
    // duplicate check
   if (existingNames.has(rawFile.name)) {
  showError(`"${rawFile.name}" is already uploaded`)
  return
}


const ext = rawFile.name.split(".").pop()?.toLowerCase() || ""

if (!ALLOWED_EXTENSIONS.has(ext)) {
  showError(`"${rawFile.name}" — unsupported file type`)
  return
}

if (rawFile.size > MAX_SIZE) {
  showError(`"${rawFile.name}" exceeds 10MB limit`)
  return
}

    setIsDragging(false)
    const id = usechatStore.getState().actions.addFile(rawFile)
    uploadFile({ raw: rawFile }, (percent) => {
      usechatStore.getState().actions.updateFileProgress(id, percent)
    })
    .then((res) => {
      usechatStore.getState().actions.updateFileProgress(id, 100)
      usechatStore.getState().actions.setFileServerData(id, res)
    })
    .catch((err) => {
      console.error("Error uploading file:", rawFile.name, err.message)
      usechatStore.getState().actions.setFileError(id)
    })
  })
}


    // attach to document — unaffected by DOM changes
    document.addEventListener("dragenter", handleDragEnter)
    document.addEventListener("dragleave", handleDragLeave)
    document.addEventListener("dragover", handleDragOver)
    document.addEventListener("drop", handleDrop)

    return () => {
      document.removeEventListener("dragenter", handleDragEnter)
      document.removeEventListener("dragleave", handleDragLeave)
      document.removeEventListener("dragover", handleDragOver)
      document.removeEventListener("drop", handleDrop)
    }
  }, [])

  return (
    <>
    <ErrorBanner message={error} />
      {children}

      <Drawer
        open={isDragging}
        onOpenChange={(open) => {
          if (!open) {
            dragCounter.current = 0
            setIsDragging(false)
          }
        }}
      >
        <DrawerContent className="border-violet-900/60 bg-sidebar" style={{ userSelect: "none" }}>
          <div className="mx-auto w-full max-w-sm py-8 flex flex-col items-center gap-4">
            <DrawerHeader className="items-center">
<DrawerTitle style={{
  fontFamily: "'IBM Plex Mono', monospace",
  color: dropMessage ? "rgba(239, 68, 68, 0.9)" : "rgba(139, 92, 246, 0.9)",
  letterSpacing: "0.05em",
}}>
  {dropMessage ?? "drop files here"}
</DrawerTitle>
<DrawerDescription style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
  {dropMessage ? "" : "release to upload"}
</DrawerDescription>
              <DrawerDescription style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                release to upload
              </DrawerDescription>
            </DrawerHeader>

            <div style={{
              width: "100%",
              height: 120,
              border: "1.5px dashed rgba(139, 92, 246, 0.5)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(139, 92, 246, 0.04)",
            }}>
              <span style={{ fontSize: 28, opacity: 0.4 }}>📂</span>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}