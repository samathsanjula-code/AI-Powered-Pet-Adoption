import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AI_API_BASE } from '../api'
import './BreedIdentificationAiPage.css'

function BreedIdentificationAiPage() {
  const { user, logout } = useAuth()
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [metadata, setMetadata] = useState({ name: '-', type: '-', dim: '-', size: '-' })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [logs, setLogs] = useState([{ time: '00:00:00', message: 'Waiting for input data...', type: '' }])
  const [steps, setSteps] = useState({ 1: '', 2: '', 3: '' }) // '', 'active', 'complete'
  const fileInputRef = useRef(null)
  const terminalRef = useRef(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (message, type = '') => {
    const time = new Date().toLocaleTimeString([], { hour12: false })
    setLogs(prev => [...prev, { time, message, type }])
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      
      // Metadata
      const img = new Image()
      img.onload = () => {
        setMetadata({
          name: file.name,
          type: file.type.split('/')[1].toUpperCase(),
          dim: `${img.width}x${img.height}px`,
          size: `${(file.size / 1024).toFixed(1)} KB`
        })
      }
      img.src = url
      
      setResult(null)
      setLogs([{ time: new Date().toLocaleTimeString([], { hour12: false }), message: 'Source file ingested successfully.', type: 'success' }])
      setSteps({ 1: '', 2: '', 3: '' })
    }
  }

  const handleDropzoneClick = () => {
    fileInputRef.current.click()
  }

  const runStep = (id, logMsg) => {
    return new Promise(resolve => {
      setSteps(prev => ({ ...prev, [id]: 'active' }))
      addLog(logMsg)
      setTimeout(() => {
        setSteps(prev => ({ ...prev, [id]: 'complete' }))
        resolve()
      }, 800)
    })
  }

  const startAnalysis = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    setResult(null)
    setSteps({ 1: '', 2: '', 3: '' })

    await runStep(1, 'Initializing Preprocessing: Resizing to 224x224...')
    await runStep(2, 'Feature Extraction: Analyzing pixel gradients...')
    await runStep(3, 'Inference: Mapping features to breed classes...')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${AI_API_BASE}/api/predict`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setResult(data.result)
      addLog('Neural inference complete. Report generated.', 'success')
    } catch (error) {
      addLog('CRITICAL ERROR: Inference engine failed.', 'error')
      console.error(error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setMetadata({ name: '-', type: '-', dim: '-', size: '-' })
    setResult(null)
    setLogs([{ time: '00:00:00', message: 'Waiting for input data...', type: '' }])
    setSteps({ 1: '', 2: '', 3: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="breed-ai-page">
      <header className="breed-ai-header">
        <Link to="/" className="breed-ai-logo">PetMatch</Link>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/pet-search">Pet Search</Link>
          <Link to="/breed-identification/admin">Breed Admin</Link>
          <Link to="/breed-identification" className="active">Breed ID</Link>
          {user ? (
            <div className="breed-ai-nav-user">
              <span>Hi, {user.name}</span>
              <button type="button" onClick={() => logout()}>Log out</button>
            </div>
          ) : (
            <Link to="/login">Sign In</Link>
          )}
        </nav>
      </header>

      <div className="dashboard">
        {/* Source Input Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Data Ingestion</span>
            <button className="reset-btn" onClick={reset}>RESET</button>
          </div>
          <div className="panel-content source-content">
            <div className={`dropzone ${previewUrl ? 'hidden' : ''}`} onClick={handleDropzoneClick}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#64748b', marginBottom: '10px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p style={{ fontWeight: 600 }}>Upload Image Here</p>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Drag & drop or click to browse</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
            </div>

            {previewUrl && (
              <div className="image-preview-container">
                <img src={previewUrl} alt="Preview" />
              </div>
            )}

            <table className="metadata-table">
              <tbody>
                <tr><td>File Name</td><td>{metadata.name}</td></tr>
                <tr><td>Format</td><td>{metadata.type}</td></tr>
                <tr><td>Dimensions</td><td>{metadata.dim}</td></tr>
                <tr><td>File Size</td><td>{metadata.size}</td></tr>
              </tbody>
            </table>

            <div style={{ marginTop: '1.5rem' }}>
              <button 
                className="btn primary" 
                disabled={!selectedFile || isAnalyzing} 
                onClick={startAnalysis}
              >
                {isAnalyzing && <div className="spinner-small"></div>}
                IDENTIFY BREEDS
              </button>
            </div>
          </div>
        </div>

        {/* Neural Engine Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Processing Engine</span>
            <span className="version-tag">{isAnalyzing ? 'PROCESSING' : 'IDLE'}</span>
          </div>
          <div className="panel-content engine-content">
            <div className="pipeline-status">
              <div className={`step ${steps[1]}`}>
                <div className="step-icon">1</div>
                <div className="step-label">PREPROCESS</div>
              </div>
              <div className={`step ${steps[2]}`}>
                <div className="step-icon">2</div>
                <div className="step-label">EXTRACT</div>
              </div>
              <div className={`step ${steps[3]}`}>
                <div className="step-icon">3</div>
                <div className="step-label">CLASSIFY</div>
              </div>
            </div>

            <div className="terminal" ref={terminalRef}>
              {logs.map((log, i) => (
                <div key={i} className="log-line">
                  <span className="log-time">[{log.time}]</span>
                  <span className={log.type === 'success' ? 'log-success' : log.type === 'error' ? 'log-error' : ''}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>

            {isAnalyzing && (
              <div className="processing-indicator">
                <div className="spinner-blue"></div>
                <p>MODEL INFERENCE IN PROGRESS</p>
              </div>
            )}
          </div>
        </div>

        {/* Inference Report Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Classification Report</span>
          </div>
          <div className="panel-content result-content">
            {!result ? (
              <div className="results-placeholder">
                <p>Execute the analysis to generate breed report</p>
              </div>
            ) : (
              <div className="results-actual">
                <div className="score-card">
                  <span className="main-label">{result.class}</span>
                  <div className="main-score">{result.confidence.toFixed(1)}%</div>
                  <p className="sub-label">Confidence Threshold</p>
                </div>

                <div className="metric-bar">
                  <div className="metric-info">
                    <span>Feline Probability</span>
                    <span>{result.probability_cat.toFixed(1)}%</span>
                  </div>
                  <div className="bar-outer">
                    <div className="bar-inner" style={{ width: `${result.probability_cat}%` }}></div>
                  </div>
                </div>

                <div className="metric-bar">
                  <div className="metric-info">
                    <span>Canine Probability</span>
                    <span>{result.probability_dog.toFixed(1)}%</span>
                  </div>
                  <div className="bar-outer">
                    <div className="bar-inner blue" style={{ width: `${result.probability_dog}%` }}></div>
                  </div>
                </div>

                <div className="result-footer">
                  <p className="footer-label">TOP PREDICTED BREED</p>
                  <div className="final-breed">{result.breed}</div>
                  <p className="footer-hint">
                    *Model accuracy may vary based on image lighting and pet orientation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BreedIdentificationAiPage
