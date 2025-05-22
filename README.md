# Hi-Pag Firebase API

This is a Node.js API for accessing the Hi-Pag Firebase project.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `serviceAccountKey.json` file in the root directory with your Firebase service account credentials. You can get this from the Firebase Console:
   - Go to Project Settings
   - Service Accounts
   - Generate New Private Key

3. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Get All Nodes
- GET `/api/nodes`
- Returns all nodes in the database

### Get Specific Node
- GET `/api/nodes/:path`
- Returns data from a specific path

### Create New Node
- POST `/api/nodes/:path`
- Body: JSON data to store
- Creates a new node at the specified path

### Update Node
- PUT `/api/nodes/:path/:id`
- Body: JSON data to update
- Updates an existing node

### Delete Node
- DELETE `/api/nodes/:path/:id`
- Deletes a specific node

## Environment Variables
- `PORT`: Server port (default: 3000) 