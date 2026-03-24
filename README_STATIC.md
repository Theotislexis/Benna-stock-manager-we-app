# Benna Stock Manager - Static Web App

This is a pure static web application that uses Supabase for all backend operations.

## Features

- Inventory management with full CRUD operations
- Audit trail tracking
- Excel export functionality
- French/English language toggle
- Freeze rule for users after the 15th of each month
- Admin user management
- Role-based access control (admin, audit_manager, user)

## Prerequisites

- Node.js 18+
- A Supabase account and project

## Setup Instructions

### 1. Supabase Configuration

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and anon key from Settings > API
3. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Database Setup

The database schema is automatically created through migrations in the `supabase/migrations` folder. These include:

- Users table with role-based access
- Inventory table with categories
- Audit logs table
- Row Level Security policies
- Default admin user (email: cheickahmedt@gmail.com, password: admin123)

### 3. Install Dependencies

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

The app will run at http://localhost:5173

### 5. Build for Production

```bash
npm run build
```

The static files will be generated in the `dist` folder.

### 6. Deploy

The `dist` folder can be deployed to any static hosting service:

- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront
- Any web server

## Default Credentials

- Email: cheickahmedt@gmail.com
- Password: admin123

**Important:** Change the password after first login!

## Environment Variables

The following environment variables are required:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

## Electron Desktop App

To build the desktop version:

```bash
npm run electron:build
```

For specific platforms:
- Windows: `npm run electron:build:win`
- macOS: `npm run electron:build:mac`
- Linux: `npm run electron:build:linux`

## Architecture

This is a pure static web application with no backend server:

- **Frontend:** React + TypeScript + Vite
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **Internationalization:** i18next

All data operations are performed directly from the browser using the Supabase client library.

## Security

- Row Level Security (RLS) is enabled on all tables
- Authentication is handled by Supabase Auth
- All API calls are made through the Supabase client with appropriate permissions
- Role-based access control is enforced at the database level

## Features by Role

### Admin
- Full access to all features
- User management (view and delete users)
- Can modify inventory at any time

### Audit Manager
- View audit logs
- Full inventory management
- Can modify inventory at any time

### User
- View and manage inventory
- Cannot modify inventory after the 15th of each month
- Limited access to audit logs
