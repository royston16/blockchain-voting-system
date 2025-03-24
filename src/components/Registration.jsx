import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Registration() {
  const [formData, setFormData] = useState({ name: '', email: '' })
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Mock cryptographic key generation
    const mockKey = `key-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('voterKey', mockKey)
    alert(`Registration successful! Your voter key: ${mockKey}`)
    navigate('/login')
  }

  return (
    <div className="card">
      <h2>Voter Registration</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ margin: '10px 0' }}>
          <label>Name: </label>
          <input 
            type="text" 
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div style={{ margin: '10px 0' }}>
          <label>Email: </label>
          <input 
            type="email" 
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <button className="button" type="submit">Register</button>
      </form>
    </div>
  )
}