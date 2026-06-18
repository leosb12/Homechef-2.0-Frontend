import { useState, useRef, useEffect } from 'react'

export default function DragDropImageUploader({ maxFiles = 3, onFilesChange, error, value = [] }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    const urls = Array.from(value).map(f => URL.createObjectURL(f))
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [value])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (filesList) => {
    const files = Array.from(filesList).filter(f => {
      const type = (f.type || '').toLowerCase()
      const name = (f.name || '').toLowerCase()
      const isImg = type === 'image/jpeg' || type === 'image/png' || type === 'image/jpg'
      const isExt = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')
      return isImg || isExt
    })
    
    if (files.length !== filesList.length) {
      onFilesChange({ target: { files: [] }, error: 'Solo se permiten fotos en formato PNG o JPG.' })
      return
    }

    if (files.length > maxFiles) {
      onFilesChange({ target: { files: files.slice(0, maxFiles) }, error: `Puedes subir un máximo de ${maxFiles} fotos.` })
      return
    }
    onFilesChange({ target: { files } })
  }

  const removeFile = (index) => {
    const newFiles = Array.from(value)
    newFiles.splice(index, 1)
    onFilesChange({ target: { files: newFiles } })
  }

  return (
    <div className="w-full">
      <div
        className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{ 
          borderColor: isDragging ? 'var(--brand)' : (error ? '#ef4444' : 'var(--line)'),
          backgroundColor: isDragging ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg)'
        }}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <span className="text-4xl mb-2 opacity-80">📸</span>
          <p className="mb-2 text-sm" style={{ color: 'var(--text)' }}>
            <span className="font-semibold" style={{ color: 'var(--brand-2)' }}>Haz clic para subir</span> o arrastra tus fotos aquí
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            PNG o JPG (Máx. {maxFiles} fotos)
          </p>
        </div>
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          accept=".png, .jpg, .jpeg" 
          multiple 
          onChange={handleChange} 
        />
      </div>

      {/* Previews */}
      {value && value.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from(value).map((file, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden aspect-video border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--bg)' }}>
              <img 
                src={URL.createObjectURL(file)} 
                alt="preview" 
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
      
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}
