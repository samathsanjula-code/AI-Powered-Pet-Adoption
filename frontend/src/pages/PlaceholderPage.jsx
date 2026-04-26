import { Link } from 'react-router-dom'

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p style={{ color: '#718096', margin: '1rem 0' }}>Coming soon...</p>
      <Link to="/" style={{ color: '#3182ce' }}>← Back to Home</Link>
    </div>
  )
}

export default PlaceholderPage
