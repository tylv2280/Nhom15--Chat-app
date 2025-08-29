import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) return;

    // 👉 gọi API login tới backend
    // fetch("http://localhost:5000/api/auth/login", { ... })
    // .then(res => res.json()).then(data => { ... })

    setUser({ email }); // giả lập login thành công
    navigate("/chat");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-200">
      <h2 className="text-2xl font-bold mb-4">🔑 Login</h2>
      <form onSubmit={handleLogin} className="flex flex-col space-y-3 w-80">
        <input
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="password"
          placeholder="Enter your password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Login
        </button>
      </form>
      <p className="mt-4">
        Don’t have an account?{" "}
        <Link to="/register" className="text-blue-500 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
