import { useState, useRef, useEffect } from 'react'

interface CameraScannerProps {
  onClose: () => void
  onScan?: (isbn: string) => void
}

export function CameraScanner({ onClose, onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startCamera()

    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setError(null)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="camera-scanner-overlay">
      <div className="camera-scanner-container">
        <div className="camera-scanner-header">
          <h3>📷 Camera Scanner</h3>
          <button className="close-camera-button" onClick={handleClose}>
            ✕ Close
          </button>
        </div>
        <div className="camera-scanner-content">
          {error ? (
            <div className="camera-error">
              <p>{error}</p>
              <button className="action-button" onClick={startCamera}>
                Retry
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
              <div className="scanner-guide">
                <p>Position the ISBN barcode within the frame</p>
                <p className="scanner-note">(Camera is active - barcode scanning coming soon)</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

