import { Link } from "react-router-dom";

// eslint-disable-next-line react/prop-types
export default function Navbar({ user, setUser }) {
  return (
    <nav style={{ marginBottom: "20px" }}>
      <Link to="/" style={{ marginRight: "15px" }}>
        Home
      </Link>
      {!user && (
        <Link to="/login" style={{ marginRight: "15px" }}>
          Login
        </Link>
      )}
      {user && (
        <>
          <Link to="/vote" style={{ marginRight: "15px" }}>
            Vote
          </Link>
          <Link to="/results" style={{ marginRight: "15px" }}>
            Results
          </Link>
          <button onClick={() => setUser(null)}>Logout</button>
        </>
      )}
    </nav>
  );
}
