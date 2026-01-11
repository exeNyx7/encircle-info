# 🔒 Encircle - End-to-End Encrypted Messaging Platform

<div align="center">

![Encircle Banner](https://img.shields.io/badge/Security-E2EE-blueviolet?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=for-the-badge&logo=socket.io)

**A modern, secure messaging platform with military-grade end-to-end encryption, built with cutting-edge web technologies and Instagram-inspired UI/UX.**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Security](#-security-architecture) • [Screenshots](#-screenshots)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Security Architecture](#-security-architecture)
- [Installation](#-installation)
- [🚀 Deployment (FREE)](#-deployment-free)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Security Testing](#-security-testing)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Encircle is a **production-ready, full-stack messaging application** that implements **Signal Protocol-inspired** end-to-end encryption (E2EE). Every message is encrypted on the sender's device and can only be decrypted by the intended recipient, ensuring complete privacy and security.

Built with a modern tech stack and featuring an **Instagram DMs-inspired interface**, Encircle demonstrates advanced web development skills, security best practices, and real-time communication expertise.

### 🎯 Project Highlights

- **🔐 Military-Grade Encryption**: Signal Protocol-inspired E2EE using Web Crypto API
- **⚡ Real-Time Communication**: WebSocket-based instant messaging with Socket.io
- **🛡️ Advanced Security**: Replay attack prevention, signature verification, security logging
- **🎨 Modern UI/UX**: Instagram-inspired interface built with Tailwind CSS & Shadcn UI
- **📱 Responsive Design**: Seamless experience across desktop and mobile devices
- **🔍 Security Monitoring**: Comprehensive security event logging and analytics dashboard

---

## ✨ Key Features

### 🔒 Security Features

- **End-to-End Encryption (E2EE)**
  - Signal Protocol-inspired key exchange (X3DH)
  - AES-GCM encryption for messages and files
  - ECDH for key agreement (P-256 curve)
  - Digital signatures using ECDSA
  - Perfect Forward Secrecy (PFS)

- **Attack Prevention**
  - Replay attack detection with sequence numbers
  - Signature verification for all key exchanges
  - Timestamp validation to prevent message replay
  - Rate limiting on authentication endpoints
  - MITM attack detection

- **Security Monitoring**
  - Real-time security event logging
  - Security analytics dashboard
  - Suspicious activity detection
  - Comprehensive audit trail

### 💬 Messaging Features

- **Real-Time Communication**
  - Instant message delivery via WebSockets
  - Message delivery & read receipts
  - Typing indicators (infrastructure ready)
  - Online/offline status

- **File Sharing**
  - Encrypted file uploads (up to 10MB)
  - Secure file downloads with decryption
  - Support for various file types
  - File metadata protection

- **User Experience**
  - Contact search and filtering
  - Message search within conversations
  - Date-grouped messages
  - Timestamp hover for detailed info
  - Instagram-style message bubbles

### 🎨 User Interface

- **Modern Design**
  - Instagram gradient theme
  - Glass-morphism effects
  - Smooth animations and transitions
  - Dark mode optimized
  - Responsive layout

- **Intuitive Navigation**
  - Two-column chat layout
  - Sidebar user list with search
  - Message search functionality
  - Floating pill-style input
  - Modal overlays for file uploads

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI Framework | 18.2.0 |
| **Tailwind CSS** | Styling | 3.x |
| **Shadcn UI** | Component Library | Latest |
| **Lucide React** | Icon System | Latest |
| **Socket.io Client** | WebSocket Client | 4.7.0 |
| **Web Crypto API** | Encryption | Native |
| **IndexedDB** | Local Key Storage | Native |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | 18+ |
| **Express.js** | Web Framework | Latest |
| **MongoDB** | Database | Latest |
| **Mongoose** | ODM | Latest |
| **Socket.io** | WebSocket Server | 4.7.0 |
| **JWT** | Authentication | Latest |
| **bcrypt** | Password Hashing | Latest |

### Security Tools

- **Web Crypto API**: Native browser cryptography
- **ECDH**: Key agreement protocol (P-256 curve)
- **AES-GCM**: Authenticated encryption
- **ECDSA**: Digital signatures
- **IndexedDB**: Secure local key storage

---

## 🔐 Security Architecture

### Encryption Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Sender    │                                    │  Recipient  │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. Generate Ephemeral Key Pair                  │
       │    (ECDH P-256)                                 │
       ├──────────────────────────────────────────────►  │
       │ 2. Perform Key Exchange (X3DH)                  │
       │    - Send Ephemeral Public Key                  │
       │    - Derive Shared Secret                       │
       │                                                  │
       │ 3. Encrypt Message                              │
       │    - AES-GCM with derived key                   │
       │    - Sign with ECDSA                            │
       ├──────────────────────────────────────────────►  │
       │ 4. Send Encrypted Payload                       │
       │    - Ciphertext                                 │
       │    - IV (Initialization Vector)                 │
       │    - Signature                                  │
       │    - Sequence Number                            │
       │                                                  │
       │                                                  │ 5. Verify Signature
       │                                                  │ 6. Check Sequence Number
       │                                                  │ 7. Derive Shared Secret
       │                                                  │ 8. Decrypt Message
       │                                                  │    (AES-GCM)
```

### Key Storage Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Client                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │           IndexedDB                         │   │
│  │  ┌────────────────────────────────────┐    │   │
│  │  │  Identity Keys (Long-term)         │    │   │
│  │  │  - Signing Key Pair                │    │   │
│  │  │  - DH Key Pair                     │    │   │
│  │  └────────────────────────────────────┘    │   │
│  │                                             │   │
│  │  ┌────────────────────────────────────┐    │   │
│  │  │  Session Keys (Per conversation)   │    │   │
│  │  │  - Ephemeral keys                  │    │   │
│  │  │  - Shared secrets                  │    │   │
│  │  └────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │         LocalStorage                        │   │
│  │  - Auth Token (JWT)                         │   │
│  │  - User ID                                  │   │
│  │  - Username                                 │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                     Server                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │           MongoDB                           │   │
│  │  - Public Keys Only                         │   │
│  │  - Key Fingerprints                         │   │
│  │  - Encrypted Messages                       │   │
│  │  - NO Private Keys                          │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Security Features Implementation

#### 1. **End-to-End Encryption**
- Messages encrypted client-side before transmission
- Server cannot decrypt message content
- Each conversation uses unique session keys
- Perfect Forward Secrecy ensures past messages remain secure

#### 2. **Replay Attack Prevention**
- Sequence numbers for every message
- Server validates message order
- Duplicate message detection
- Automatic session invalidation on replay attempts

#### 3. **Man-in-the-Middle Protection**
- Public key fingerprints for verification
- Digital signatures on all key exchanges
- Key bundle integrity verification
- Certificate pinning ready

#### 4. **Authentication & Authorization**
- JWT-based authentication
- bcrypt password hashing (10 rounds)
- Rate limiting on auth endpoints
- Session timeout and refresh

---

## 📦 Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v5 or higher)
- **npm** or **yarn**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/encircle-info.git
   cd encircle-info
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure environment variables**

   **Server (.env file in `/server` directory):**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/encircle
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

   **Client (.env file in `/client` directory):**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   mongod

   # macOS/Linux
   sudo systemctl start mongod
   ```

5. **Run the application**

   **Terminal 1 - Start Server:**
   ```bash
   cd server
   npm start
   ```

   **Terminal 2 - Start Client:**
   ```bash
   cd client
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Production Build

```bash
# Build client for production
cd client
npm run build

# Serve built files with a production server
# (e.g., nginx, Apache, or serve package)
```

---

## � Deployment (FREE)

Deploy Encircle completely **free** using modern cloud platforms! See our comprehensive [DEPLOYMENT.md](DEPLOYMENT.md) guide for detailed instructions.

### Quick Deployment Overview

| Component | Platform | Free Tier | Link |
|-----------|----------|-----------|------|
| **Frontend** | Vercel | ✅ Unlimited bandwidth | [Deploy Frontend](https://vercel.com) |
| **Backend** | Render | ✅ 750 hours/month | [Deploy Backend](https://render.com) |
| **Database** | MongoDB Atlas | ✅ 512MB storage | [Setup Database](https://cloud.mongodb.com) |

### Deployment Steps (Summary)

1. **MongoDB Atlas**: Create free cluster, get connection string
2. **Render**: Deploy backend with environment variables
3. **Vercel**: Deploy frontend with backend URL
4. **Update CORS**: Add Vercel URL to backend allowed origins

**📖 Full Guide**: [DEPLOYMENT.md](DEPLOYMENT.md) - Complete step-by-step instructions with screenshots and troubleshooting

### Your App Will Be Live At:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`
- **Database**: MongoDB Atlas cluster

**Total Cost: $0/month** 💰

---

## �📁 Project Structure

```
encircle-info/
├── client/                      # React frontend
│   ├── public/
│   │   └── index.html          # HTML template
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Chat.js        # Main chat interface
│   │   │   ├── Login.js       # Login page
│   │   │   ├── Register.js    # Registration page
│   │   │   ├── FileUpload.js  # File upload component
│   │   │   └── SecurityLogs.js # Security dashboard
│   │   ├── hooks/             # Custom React hooks
│   │   │   └── useKeyExchange.js
│   │   ├── utils/             # Utility functions
│   │   │   ├── api.js         # API client
│   │   │   ├── crypto.js      # Encryption utilities
│   │   │   ├── keyExchange.js # X3DH implementation
│   │   │   ├── storage.js     # IndexedDB wrapper
│   │   │   └── securityLogger.js
│   │   ├── App.js             # Root component
│   │   ├── index.js           # Entry point
│   │   └── index.css          # Global styles (Tailwind)
│   ├── tailwind.config.js     # Tailwind configuration
│   ├── postcss.config.js      # PostCSS configuration
│   └── package.json
│
├── server/                     # Node.js/Express backend
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── rateLimiter.js     # Rate limiting
│   ├── models/                # MongoDB schemas
│   │   ├── User.js            # User model
│   │   ├── Message.js         # Message model
│   │   ├── File.js            # File model
│   │   └── SecurityLog.js     # Security event model
│   ├── routes/                # API routes
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── users.js           # User management
│   │   ├── messages.js        # Message endpoints
│   │   ├── files.js           # File handling
│   │   └── security.js        # Security logs API
│   ├── utils/
│   │   └── securityLogger.js  # Server-side logging
│   ├── index.js               # Server entry point
│   └── package.json
│
├── security-tests/            # Security testing tools
│   ├── mitm-proxy.js          # MITM attack simulator
│   ├── replay-attack.js       # Replay attack tester
│   └── package.json
│
└── README.md                  # This file
```

---

## 🔌 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "alice",
  "password": "securepassword123",
  "publicKey": "{\"signing\": {...}, \"dh\": {...}}",
  "keyFingerprint": "abc123..."
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "securepassword123"
}
```

### Users

#### Get All Users
```http
GET /api/users
Authorization: Bearer <token>
```

#### Get User's Public Key
```http
GET /api/users/:userId/public-key
Authorization: Bearer <token>
```

### Messages

#### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "user123",
  "ciphertext": "encrypted_data",
  "iv": "initialization_vector",
  "keyId": "session_key_id",
  "ephemeralPublicKey": "{...}",
  "signature": "digital_signature",
  "sequenceNumber": 1
}
```

#### Get Messages
```http
GET /api/messages
Authorization: Bearer <token>
```

### Files

#### Upload Encrypted File
```http
POST /api/files
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1024000,
  "ciphertext": "encrypted_file_data",
  "iv": "initialization_vector",
  "keyId": "session_key_id",
  "recipientId": "user123"
}
```

### Security

#### Get Security Statistics
```http
GET /api/security/stats
Authorization: Bearer <token>
```

#### Get Security Logs
```http
GET /api/security/logs?eventType=auth_failure&limit=100
Authorization: Bearer <token>
```

---

## 🧪 Security Testing

The project includes security testing tools to validate encryption and attack prevention:

### MITM Attack Simulation

Test the application's resistance to Man-in-the-Middle attacks:

```bash
cd security-tests
npm install
node mitm-proxy.js
```

Configure client to point to the MITM proxy and verify that signature verification prevents message tampering.

### Replay Attack Testing

Test replay attack prevention:

```bash
cd security-tests
node replay-attack.js
```

Verify that duplicate messages with the same sequence number are rejected.

### Testing Checklist

- ✅ End-to-end encryption verified
- ✅ Replay attacks prevented
- ✅ Invalid signatures rejected
- ✅ MITM attempts detected
- ✅ Rate limiting functional
- ✅ Session management secure
- ✅ File encryption working
- ✅ Key exchange validated

---

## 📸 Screenshots

### Login Screen
Modern authentication with Instagram-inspired gradient and card design.

### Chat Interface
Two-column layout with glass-morphism sidebar and Instagram-style message bubbles.

### Security Dashboard
Comprehensive security monitoring with real-time statistics and event logs.

### File Sharing
Encrypted file uploads with progress indicators and secure downloads.

---

## 🚀 Features Roadmap

### Planned Features

- [ ] **Group Chats**: Multi-party encrypted conversations
- [ ] **Voice Messages**: Encrypted audio messages
- [ ] **Video Calls**: P2P encrypted video communication
- [ ] **Message Reactions**: Emoji reactions to messages
- [ ] **Push Notifications**: Real-time notification system
- [ ] **Multi-Device Support**: Sync across devices
- [ ] **Message Editing**: Edit sent messages
- [ ] **Message Deletion**: Delete messages for everyone
- [ ] **User Profiles**: Customizable user profiles
- [ ] **Status Updates**: WhatsApp-style status feature

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow existing code formatting
- Use meaningful variable and function names
- Comment complex encryption logic
- Write tests for new features
- Update documentation

---

## 🎓 Learning Resources

This project demonstrates:

- **Full-stack development** with React and Node.js
- **Real-time communication** using WebSockets
- **Cryptography implementation** with Web Crypto API
- **Secure authentication** with JWT
- **Modern UI design** with Tailwind CSS
- **Database management** with MongoDB
- **Security best practices** and threat mitigation

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Your Name**

- GitHub: [@exeNyx7](https://github.com/exeNyx7)
- LinkedIn: [Dawood Qamar](https://linkedin.com/in/https://www.linkedin.com/in/dawood-qamar/)
- Portfolio: [https://nyx-portfolio.web.app/](https://nyx-portfolio.web.app/)

---

## 🙏 Acknowledgments

- **Signal Protocol** for E2EE inspiration
- **Shadcn UI** for component design patterns
- **Tailwind CSS** for utility-first styling
- **Instagram** for UI/UX inspiration
- Open source community for amazing tools

---

## 🔒 Security Disclosure

If you discover a security vulnerability, please email work.dawoodqamar@gmail.com . We appreciate your responsible disclosure.

---

<div align="center">

</div>
