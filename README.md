# Robotics Website

A modern, responsive website for robotics with real-time notifications and admin panel.

## Features

- Real-time notifications system with countdown
- Admin panel for sending timed notifications
- Modern UI with animations
- Responsive design
- Background video integration

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Framer Motion
- HeadlessUI

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account

## Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd robotics-website
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

## Deployment to Netlify

### Option 1: Deploy with Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Initialize Netlify:
```bash
netlify init
```

4. Deploy:
```bash
netlify deploy --prod
```

### Option 2: Deploy via Netlify Dashboard

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Log in to your Netlify account

3. Click "New site from Git"

4. Choose your repository

5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Add environment variables in Netlify dashboard:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

7. Deploy!

## Environment Variables

Make sure to set these in your Netlify dashboard:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Database Setup

1. Create a new Supabase project

2. Run the SQL from `src/lib/supabase-init.sql` in the Supabase SQL editor

## Admin Access

Default admin password: 234

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 