import { useRef } from "react"
import { DiamondPlusIcon } from "lucide-react"
import VioletButton from "@/components/common/VioletButton"

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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.md,.js,.ts,.jsx,.tsx,.html,.css,.png,.jpg,.jpeg,.gif,.webp"


        className="hidden"
        onChange={handleChange}
      />
        <VioletButton size={29} label="Attach" icon="plus" bare onClick={() => inputRef.current.click()} />
    </>
  )
}