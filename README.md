# 📌 ChatApp (Convoxa)

💬 Real-time chat application with secure authentication, email verification, and modern UI.

---

## 🚀 Features

- 🔐 JWT Authentication (Register/Login)
- 📧 Email Verification (Gmail SMTP)
- 💬 Real-time messaging (Socket.IO)
- 🟢 Online/offline status
- 🧑‍🤝‍🧑 Chat rooms & private messaging
- 🖼️ Profile management (avatar, bio)
- 🔔 Notification preferences
- 🌙 Dark mode support
- 📩 Invite friends via link
- 🔒 Secure password handling (hashed)

---

## 🛠️ Tech Stack

### 🔹 Frontend
- ⚛️ React (Vite)
- 🎨 Tailwind CSS
- 🔄 Zustand (state management)
- 🔌 Socket.IO Client
- 🍞 React Hot Toast

### 🔹 Backend
- ⚡ FastAPI
- 🔌 Socket.IO (python-socketio)
- 🧠 JWT Authentication
- 📨 Gmail SMTP (aiosmtplib)
- 🌐 REST APIs

### 🔹 Database & Services
- 🍃 MongoDB (Motor)
- ⚡ Redis (optional)
- ☁️ Cloudinary (media uploads)

---

## 📂 Project Structure


chatapp/
│
├── backend/
│ ├── app/
│ │ ├── api/
│ │ ├── core/
│ │ ├── db/
│ │ ├── models/
│ │ ├── services/
│ │ └── main.py
│ └── .env
│
├── frontend/
│ ├── src/
│ ├── components/
│ ├── pages/
│ └── App.jsx

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository
git clone https://github.com/yourusername/chatapp.git
cd chatapp
2️⃣ Backend Setup
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
3️⃣ Configure Environment Variables

Create .env inside backend/:

MONGO_URI=your_mongodb_uri

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_app_password

FRONTEND_URL=http://localhost:5173
4️⃣ Run Backend
uvicorn app.main:app --reload

Backend runs at:
👉 http://localhost:8000

5️⃣ Frontend Setup
cd ../frontend
npm install
npm run dev

Frontend runs at:
👉 http://localhost:5173

🔑 Authentication Flow
User registers
Verification email sent 📩
User clicks link → verified
Login allowed
JWT used for API access
🔌 API Endpoints
Auth
POST /api/auth/register
POST /api/auth/login
GET /api/auth/verify-email
POST /api/auth/resend-verification
User
PUT /api/auth/profile
GET /api/auth/me

🔒 Security
Password hashing (bcrypt)
Email verification required
JWT authentication

📸 Screenshots

<img width="2558" height="1315" alt="Screenshot 2026-04-28 210410" src="https://github.com/user-attachments/assets/60358c35-6665-40e4-bb31-ce76b6c437fb" />

<img width="2554" height="1312" alt="Screenshot 2026-04-28 205419" src="https://github.com/user-attachments/assets/955a0fa9-d2c2-46a6-8425-c39e7d6d65e0" />

<img width="2232" height="705" alt="Screenshot 2026-04-28 210747" src="https://github.com/user-attachments/assets/91b89a1b-99d8-4bf9-afc9-92354e925fae" />
<img width="2557" height="1311" alt="Screenshot 2026-04-28 210537" src="https://github.com/user-attachments/assets/7e85483c-20fb-4514-a507-fb75d52ba155" />
<img width="2559" height="1316" alt="Screenshot 2026-04-28 210459" src="https://github.com/user-attachments/assets/b5bab808-da55-43b4-b4da-6c3b7140fc12" />



Add your UI screenshots here

🚀 Future Improvements
Typing indicator 💬
Message reactions 👍
Push notifications 🔔
Group chat improvements 👥
Read receipts ✔✔
AI-based message suggestions 🤖
🤝 Contributing

Pull requests are welcome!
For major changes, open an issue first.

📄 License

MIT License

💬 Author

Manasha Pavithra J

⭐ Support

If you like this project, give it a ⭐ on GitHub!
