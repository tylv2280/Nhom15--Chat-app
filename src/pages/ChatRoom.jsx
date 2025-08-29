import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function ChatRoom({ user }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.off("chatMessage");
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const newMsg = { user: user?.email || "Guest", text: message };
      socket.emit("chatMessage", newMsg);
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-blue-600 text-white p-4 font-bold">
        Chat Room
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className="p-2 bg-gray-100 rounded-lg">
            <strong>{m.user}:</strong> {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex p-4 bg-gray-200">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded-l-lg"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-r-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}
