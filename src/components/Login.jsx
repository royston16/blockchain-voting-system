import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login({ setUser }) {
  const [key, setKey] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    if (key === localStorage.getItem('voterKey')) {
      setUser({ key })
      navigate('/vote')
    } else {
      alert('Invalid voter key')
    }
  }

  return (
    <div className="card">
      <h2>Voter Login</h2>
      <form onSubmit={handleLogin}>
        <div style={{ margin: '10px 0' }}>
          <label>Voter Key: </label>
          <input 
            type="password" 
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <button className="button" type="submit">Login</button>
      </form>
    </div>
  )
}