# Express API with MongoDB & Gemini AI

A professional, production-ready Express.js API with industrial-standard architecture, featuring MongoDB integration, JWT authentication, password hashing, logging, error handling, API documentation, and Gemini AI integration.

## 🚀 Features

- **Industrial Standard Architecture**: Organized with controllers, models, routes, middleware, and services
- **MongoDB Integration**: Using Mongoose ODM with proper schema validation
- **JWT Authentication**: Secure token-based authentication with password hashing
- **Password Security**: Bcrypt with configurable salt rounds
- **API Documentation**: Swagger/OpenAPI 3.0 documentation
- **Logging**: Winston-based logging with file rotation
- **Error Handling**: Centralized error handling with custom error classes
- **Rate Limiting**: Protection against abuse
- **Security Headers**: Helmet.js for security headers
- **CORS Support**: Configurable cross-origin resource sharing
- **Gemini AI Integration**: Google's Gemini 2.5 AI model integration
- **Input Validation**: Express-validator for request validation
- **Environment Configuration**: Dotenv for environment variables

## 📁 Project Structure

```
api/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── swagger.js           # Swagger configuration
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   └── aiController.js      # AI integration logic
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── errorHandler.js     # Global error handling
│   ├── models/
│   │   └── User.js              # User model schema
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── ai.js                # AI routes
│   │   └── index.js             # General routes
│   ├── services/
│   │   └── geminiService.js     # Gemini AI service
│   ├── utils/
│   │   └── logger.js            # Winston logger configuration
│   └── app.js                   # Express app configuration
├── logs/                        # Log files
├── docs/                        # Documentation
├── tests/                       # Test files
├── .env.example                 # Environment variables example
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies and scripts
└── server.js                    # Application entry point
```

## 🛠️ Installation

1. **Clone and navigate to the project:**
   ```bash
   cd api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/your_database_name

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=30d

   # Bcrypt Configuration
   BCRYPT_SALT_ROUNDS=12

   # Google Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key_here

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

5. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger Documentation**: `http://localhost:5000/api-docs`
- **API Base URL**: `http://localhost:5000/api`

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <your_jwt_token>
```

## 🤖 AI Endpoints

### Generate Text
```http
POST /api/ai/generate
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "prompt": "Write a creative story about space exploration",
  "maxTokens": 1000,
  "temperature": 0.7
}
```

### Analyze Text
```http
POST /api/ai/analyze
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "text": "This is a sample text to analyze",
  "analysisType": "sentiment"
}
```

### Chat Completion
```http
POST /api/ai/chat
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "maxTokens": 500,
  "temperature": 0.7
}
```

## 🔒 Security Features

- **Password Hashing**: Bcrypt with configurable salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for protection
- **Input Validation**: Request validation using express-validator
- **Error Handling**: Secure error responses without sensitive data leakage

## 📊 Monitoring & Logging

- **Winston Logging**: Structured logging with different levels
- **File Rotation**: Automatic log file rotation
- **Error Tracking**: Comprehensive error logging
- **Health Check**: `/api/health` endpoint for monitoring

## 🧪 Testing

```bash
npm test
```

## 📋 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `30d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |
| `GEMINI_API_KEY` | Google Gemini API key | Required for AI features |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## 🚀 Deployment

1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set secure JWT secrets
4. Configure CORS for production domains
5. Set up process manager (PM2, Docker, etc.)

## 📝 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

**Happy Coding! 🎉**
