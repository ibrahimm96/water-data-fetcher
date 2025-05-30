import { Link, useLocation } from 'react-router-dom'

export function Navigation() {
  const location = useLocation()
  
  const navStyle = {
    backgroundColor: '#2c3e50',
    padding: '1rem',
    marginBottom: '2rem'
  }
  
  const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    marginRight: '1rem',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    border: 'none'
  }
  
  const activeLinkStyle = {
    ...linkStyle,
    backgroundColor: '#34495e'
  }
  
  return (
    <nav style={navStyle}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ color: 'white', margin: '0', marginRight: '2rem' }}>
          California Groundwater Monitor
        </h1>
        <Link 
          to="/" 
          style={location.pathname === '/' ? activeLinkStyle : linkStyle}
        >
          Map View
        </Link>
        <Link 
          to="/table" 
          style={location.pathname === '/table' ? activeLinkStyle : linkStyle}
        >
          Data Table
        </Link>
      </div>
    </nav>
  )
}