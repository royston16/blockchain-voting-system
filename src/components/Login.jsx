import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-image.png";
// eslint-disable-next-line react/prop-types
export default function Login({ setUser }) {
  const [key, setKey] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (key === localStorage.getItem("voterKey")) {
      setUser({ key });
      navigate("/vote");
    } else {
      alert("Invalid voter key");
    }
  };

  return (
    <div className="card flex justify-between">
      <form onSubmit={handleLogin} className="w-full pr-4">
        <h2 className="font-bold text-xl">Voter Login</h2>
        <div style={{ margin: "10px 0" }}>
          <label className="font-semibold">Voter Key: </label>
          <input
            type="password"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <button className="button" type="submit">
          Login
        </button>
      </form>
      <img src={bg} alt="background" className="w-1/2" />
    </div>
  );
}
