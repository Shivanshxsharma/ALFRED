import { useRef } from "react"
import { DiamondPlusIcon } from "lucide-react"
import VioletButton from "./VioletButton"

export default function UploadButton({ onFile }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.py,.js,.ts,.json,.csv,.jsx,.tsx,.html,.css,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.avi,.mp3,.wav,.zip,.rar,.7z"
        className="hidden"
        onChange={handleChange}
      />
        <VioletButton size={29} label="Attach" icon="+" bare onClick={() => inputRef.current.click()} />
    </>
  )
}