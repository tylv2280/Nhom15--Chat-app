import socket
import threading
import tkinter as tk
from tkinter import scrolledtext

# Cấu hình server
HOST = '127.0.0.1'
PORT = 12345

# Tạo socket TCP
client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect((HOST, PORT))

# Hàm nhận tin nhắn từ server
def receive_messages():
    while True:
        try:
            message = client.recv(1024).decode('utf-8')
            chat_box.config(state='normal')
            chat_box.insert(tk.END, f"\n📩 {message}")
            chat_box.config(state='disabled')
        except:
            break

# Hàm gửi tin nhắn đến server
def send_message():
    message = message_entry.get()
    message_entry.delete(0, tk.END)
    try:
        client.send(message.encode('utf-8'))
    except:
        chat_box.config(state='normal')
        chat_box.insert(tk.END, "\n❌ Không gửi được tin nhắn.")
        chat_box.config(state='disabled')

# Tạo giao diện GUI
window = tk.Tk()
window.title("💬 Chat Client")

chat_box = scrolledtext.ScrolledText(window, width=50, height=20)
chat_box.pack(padx=10, pady=10)
chat_box.config(state='disabled')

message_entry = tk.Entry(window, width=40)
message_entry.pack(side=tk.LEFT, padx=(10, 0), pady=(0, 10))

send_button = tk.Button(window, text="Gửi", command=send_message)
send_button.pack(side=tk.LEFT, padx=(5, 10), pady=(0, 10))

# Tạo luồng nhận tin nhắn
receive_thread = threading.Thread(target=receive_messages)
receive_thread.daemon = True
receive_thread.start()

# Chạy GUI
window.mainloop()
