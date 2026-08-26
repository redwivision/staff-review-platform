# Staff Review Platform

A comprehensive platform for managing staff reviews, coaching, and performance tracking.

## Key Components
- **Backend**: Built with TypeScript and Express.js (`server.ts`)
- **Frontend**: React-based UI in `src/` directory using Vite and Tailwind CSS
- **Firebase**: Authentication and database configuration (`firebase.json`, `firebase-applet-config.json`)
- **Testing**: Load testing with K6 (`load-test.js`), UI tests with Playwright (`playwright.config.ts` and `tests/ui/`)

## Setup Instructions
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
4. Start production server: `npm run start`
5. Run linting: `npm run lint`

## Features
- Staff performance reviews
- Coaching invitations and nominations
- Admin reporting dashboard
- PDF export functionality

## Technologies
- **Frontend**: React, Vite, Tailwind CSS, Motion
- **Backend**: Node.js, Express.js, TypeScript
- **Database & Auth**: Firebase
- **AI**: Google GenAI
- **Testing**: Playwright (UI), K6 (Load Testing)
- **Utilities**: jsPDF

## Contributing
- Fork the repository
- Create a feature branch
- Submit pull requests

## License
MIT
