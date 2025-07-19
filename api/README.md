# CalcNote API with MongoDB & Gemini AI

A professional, production-ready Express.js API for the CalcNote application, a smart notepad that performs real-time calculations as users type numbers and formulas. The API features industrial-standard architecture, MongoDB integration, JWT authentication, password hashing, logging, error handling, API documentation, and Gemini AI integration.

## 🚀 Features

### Core API Features
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

### CalcNote Specific Features
- **User Management**: Registration, authentication, and profile management
- **Note Management**: Create, read, update, and delete notes with calculation capabilities
- **Note Versioning**: Track and restore previous versions of notes
- **Password-Protected Notes**: Secure notes with password protection
- **Tags System**: Categorize notes with customizable tags
- **Group Organization**: Organize notes in hierarchical groups/folders
- **Calculation Support**: Store calculation metadata and results
- **User Preferences**: Customizable settings for theme, decimal precision, etc.

## 📁 Project Structure

```
api/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── env.example          # Environment variables template
│   │   └── swagger.js           # Swagger configuration
│   ├── controllers/
│   │   ├── userController.js    # User authentication and profile management
│   │   ├── noteController.js    # Note CRUD operations and versioning
│   │   ├── tagController.js     # Tag management
│   │   ├── groupController.js   # Group/folder management
│   │   └── aiController.js      # AI integration logic
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── errorHandler.js      # Global error handling
│   ├── models/
│   │   ├── User.js              # User model schema
│   │   ├── Note.js              # Note model schema with calculation support
│   │   ├── NoteVersion.js       # Note version history schema
│   │   ├── Tag.js               # Tag model schema
│   │   ├── Group.js             # Group/folder model schema
│   │   ├── index.js             # Models export file
│   │   └── README.md            # Models documentation
│   ├── routes/
│   │   ├── userRoutes.js        # User authentication and profile routes
│   │   ├── noteRoutes.js        # Note management routes
│   │   ├── tagRoutes.js         # Tag management routes
│   │   ├── groupRoutes.js       # Group management routes
│   │   └── index.js             # Routes index
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
   git clone https://github.com/yourusername/nexus_six.git
   cd nexus_six/api
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
   MONGODB_URI=mongodb://localhost:27017/calcnote_db
   MONGODB_DEBUG=false

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30

   # Bcrypt Configuration
   BCRYPT_SALT_ROUNDS=12

   # Google Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key_here

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   
   # Logging Configuration
   LOG_LEVEL=info
   LOG_FILE=./logs/app.log
   ```

5. **Start MongoDB:**
   Ensure MongoDB is running on your system or use a cloud-hosted MongoDB instance.

6. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

7. **Test the API:**
   ```bash
   # The API will be available at:
   http://localhost:5000/api
   
   # API documentation will be available at:
   http://localhost:5000/api-docs
   ```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger Documentation**: `http://localhost:5000/api-docs`
- **API Base URL**: `http://localhost:5000/api`

## 🔐 User Authentication Endpoints

### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Login User
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Get Current User
```http
GET /api/users/me
Authorization: Bearer <your_jwt_token>
```

### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "username": "johndoe_updated",
  "bio": "Software developer and note-taking enthusiast",
  "preferences": {
    "theme": "dark",
    "fontSize": "medium",
    "decimalPrecision": 4,
    "currencySymbol": "$",
    "autoSave": true
  }
}
```

### Update Password
```http
PUT /api/users/password
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "currentPassword": "SecurePass123",
  "newPassword": "EvenMoreSecure456"
}
```

### Logout User
```http
POST /api/users/logout
Authorization: Bearer <your_jwt_token>
```

## 📝 Note Management Endpoints

### Get All Notes
```http
GET /api/notes?group=groupId&tags=tag1,tag2&archived=false&favorite=true&search=keyword&page=1&limit=10
Authorization: Bearer <your_jwt_token>
```

### Get Single Note
```http
GET /api/notes/:id
Authorization: Bearer <your_jwt_token>
```

### Create Note
```http
POST /api/notes
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "title": "Budget Calculations",
  "content": "<p>Monthly Income: $5000</p><p>Expenses: $3000</p><p>Savings: $2000</p>",
  "isProtected": false,
  "password": null,
  "group": "groupId",
  "tags": ["finance", "budget"],
  "isPublic": false,
  "isArchived": false,
  "isFavorite": true,
  "calculationEnabled": true,
  "decimalPrecision": 2,
  "variables": {
    "income": 5000,
    "expenses": 3000
  }
}
```

### Update Note
```http
PUT /api/notes/:id
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "title": "Updated Budget Calculations",
  "content": "<p>Monthly Income: $5500</p><p>Expenses: $3200</p><p>Savings: $2300</p>",
  "tags": ["finance", "budget", "monthly"],
  "isFavorite": true,
  "variables": {
    "income": 5500,
    "expenses": 3200
  }
}
```

### Delete Note
```http
DELETE /api/notes/:id
Authorization: Bearer <your_jwt_token>
```

### Get Note Versions
```http
GET /api/notes/:id/versions
Authorization: Bearer <your_jwt_token>
```

### Get Specific Note Version
```http
GET /api/notes/:id/versions/:versionId
Authorization: Bearer <your_jwt_token>
```

### Restore Note Version
```http
POST /api/notes/:id/versions/:versionId/restore
Authorization: Bearer <your_jwt_token>
```

## 🏷️ Tag Management Endpoints

### Get All Tags
```http
GET /api/tags
Authorization: Bearer <your_jwt_token>
```

### Get Single Tag
```http
GET /api/tags/:id
Authorization: Bearer <your_jwt_token>
```

### Create Tag
```http
POST /api/tags
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "name": "finance",
  "color": "#00FF00",
  "description": "Financial notes and calculations",
  "isGlobal": false
}
```

### Update Tag
```http
PUT /api/tags/:id
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "name": "finances",
  "color": "#00AA00",
  "description": "Financial planning and calculations"
}
```

### Delete Tag
```http
DELETE /api/tags/:id
Authorization: Bearer <your_jwt_token>
```

### Get Notes with Tag
```http
GET /api/tags/:id/notes
Authorization: Bearer <your_jwt_token>
```

## 📂 Group Management Endpoints

### Get All Groups
```http
GET /api/groups?parent=parentId&archived=false
Authorization: Bearer <your_jwt_token>
```

### Get Single Group
```http
GET /api/groups/:id
Authorization: Bearer <your_jwt_token>
```

### Create Group
```http
POST /api/groups
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "name": "Personal Finance",
  "description": "Notes related to personal finances",
  "parent": null,
  "color": "#3498db",
  "icon": "folder-dollar",
  "isShared": false,
  "isArchived": false,
  "sortOrder": 1
}
```

### Update Group
```http
PUT /api/groups/:id
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "name": "Financial Planning",
  "description": "Long-term financial planning notes",
  "color": "#2980b9",
  "isArchived": false
}
```

### Delete Group
```http
DELETE /api/groups/:id?force=true&moveNotesTo=parentGroupId
Authorization: Bearer <your_jwt_token>
```

### Get Notes in Group
```http
GET /api/groups/:id/notes?includeSubgroups=true&page=1&limit=10
Authorization: Bearer <your_jwt_token>
```

### Get Group Path (Breadcrumbs)
```http
GET /api/groups/:id/path
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

## 📊 Database Schema

The CalcNote API uses MongoDB with Mongoose ODM for data storage. Below are the main data models and their relationships:

### User Model

```javascript
{
  username: String,           // Unique username
  email: String,              // Unique email address
  password: String,           // Hashed password
  profilePicture: String,     // URL to profile picture
  bio: String,                // User biography
  isVerified: Boolean,        // Email verification status
  createdAt: Date,            // Account creation timestamp
  updatedAt: Date,            // Last update timestamp
  lastLogin: Date,            // Last login timestamp
  preferences: {              // User preferences
    theme: String,            // UI theme (light/dark)
    fontSize: String,         // Font size (small/medium/large)
    decimalPrecision: Number, // Default decimal precision for calculations
    currencySymbol: String,   // Default currency symbol
    autoSave: Boolean         // Auto-save preference
  }
}
```

### Note Model

```javascript
{
  title: String,              // Note title
  content: String,            // Note content (supports HTML)
  isProtected: Boolean,       // Password protection flag
  password: String,           // Hashed password (if protected)
  user: ObjectId,             // Reference to User model
  group: ObjectId,            // Reference to Group model
  tags: [ObjectId],           // Array of references to Tag model
  isPublic: Boolean,          // Public visibility flag
  isArchived: Boolean,        // Archive status
  isFavorite: Boolean,        // Favorite status
  viewCount: Number,          // Number of views
  lastCalculationResult: String, // Last calculation result
  variables: Object,          // Stored variables for calculations
  metadata: {                 // Note metadata
    calculationEnabled: Boolean, // Enable/disable calculations
    decimalPrecision: Number,    // Decimal precision for this note
    createdAt: Date,             // Creation timestamp
    updatedAt: Date              // Last update timestamp
  }
}
```

### NoteVersion Model

```javascript
{
  note: ObjectId,             // Reference to Note model
  title: String,              // Note title at this version
  content: String,            // Note content at this version
  versionNumber: Number,      // Sequential version number
  createdBy: ObjectId,        // Reference to User model
  createdAt: Date,            // Version creation timestamp
  calculationResults: String, // Calculation results at this version
  variables: Object,          // Variables at this version
  metadata: Object,           // Metadata at this version
  changeDescription: String   // Description of changes made
}
```

### Tag Model

```javascript
{
  name: String,               // Tag name
  color: String,              // Tag color (hex code)
  user: ObjectId,             // Reference to User model
  description: String,        // Tag description
  isGlobal: Boolean,          // Global tag flag
  usageCount: Number,         // Number of notes using this tag
  createdAt: Date,            // Creation timestamp
  updatedAt: Date             // Last update timestamp
}
```

### Group Model

```javascript
{
  name: String,               // Group name
  description: String,        // Group description
  user: ObjectId,             // Reference to User model
  parent: ObjectId,           // Reference to parent Group (for nesting)
  color: String,              // Group color (hex code)
  icon: String,               // Group icon identifier
  isShared: Boolean,          // Sharing status
  isArchived: Boolean,        // Archive status
  sortOrder: Number,          // Custom sort order
  createdAt: Date,            // Creation timestamp
  updatedAt: Date             // Last update timestamp
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
| `MONGODB_DEBUG` | Enable Mongoose debug mode | `false` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `30d` |
| `JWT_COOKIE_EXPIRE` | JWT cookie expiration in days | `30` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |
| `GEMINI_API_KEY` | Google Gemini API key | Required for AI features |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `LOG_LEVEL` | Winston logger level | `info` |
| `LOG_FILE` | Log file path | `./logs/app.log` |

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
