import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (!email || !username || !password) return;

    // 👉 gọi API register tới backend
    // fetch("http://localhost:5000/api/auth/register", { ... })

    navigate("/login"); // giả lập đăng ký thành công
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">📝 Register</h2>
      <form onSubmit={handleRegister} className="flex flex-col space-y-3 w-80">
        <input
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Choose a username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="password"
          placeholder="Enter a password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Register
        </button>
      </form>
      <p className="mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500 underline">
          Login
        </Link>
      </p>
    </div>
  );
}
