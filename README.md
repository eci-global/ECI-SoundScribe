# SoundScribe

A comprehensive AI-powered call analysis and employee tracking platform built with React, TypeScript, and Supabase.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access the application
open http://localhost:8080
```

## 📁 Project Structure

```
soundscribe/
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── admin/               # Admin components
│   │   ├── employee/            # Employee management
│   │   └── ui/                  # UI components
│   ├── pages/                   # Route components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   ├── types/                   # TypeScript definitions
│   └── utils/                   # Helper functions
├── supabase/                     # Supabase configuration
│   ├── functions/               # Edge Functions
│   ├── migrations/              # Database migrations
│   └── config.toml             # Supabase config
├── scripts/                      # Maintenance scripts
│   ├── run.js                   # Main script runner
│   ├── database/                # Database maintenance
│   ├── testing/                  # Test utilities
│   ├── deployment/              # Deployment scripts
│   └── maintenance/             # General maintenance
├── tools/                        # Development tools
│   ├── debug/                   # Debug utilities
│   └── analysis/                # Analysis tools
├── docs/                         # Documentation
│   ├── architecture/            # Architecture docs
│   ├── guides/                  # User guides
│   └── troubleshooting/        # Troubleshooting
└── tests/                       # Test files
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project
4. Configure environment variables
5. Run migrations: `npm run db:push`

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Database
npm run db:push         # Apply database migrations
npm run db:reset        # Reset local database
npm run db:status       # Check database status

# Maintenance
node scripts/run.js database check     # Check database status
node scripts/run.js testing system    # Run system tests
```

## 🗄️ Database Management

### Using the Scripts Runner

```bash
# List all database scripts
node scripts/run.js database list

# Check database connection and tables
node scripts/run.js database check

# Run a specific database script
node scripts/run.js database run fix-recordings-table.sql
```

### Available Database Scripts

- **Schema Fixes**: `fix-*.sql` - Fix database schema issues
- **Quick Fixes**: `quick-fix-*.sql` - Quick database fixes
- **Data Checks**: `check-*.sql` - Check data integrity
- **Schema Additions**: `add-*.sql` - Add new schema elements
- **Permissions**: `grant-*.sql`, `force-*.sql` - Manage permissions
- **Maintenance**: `enable-*.sql`, `manual-*.sql` - Maintenance tasks

## 🧪 Testing

### Using the Test Runner

```bash
# List all test scripts
node scripts/run.js testing list

# Run comprehensive system tests
node scripts/run.js testing system

# Test specific components
node scripts/run.js testing database
node scripts/run.js testing auth
node scripts/run.js testing functions

# Run a specific test
node scripts/run.js testing run check-recordings.js
```

### Available Tests

- **Database Tests**: `check-*.js` - Database connectivity tests
- **System Tests**: `test-*.js` - System integration tests
- **Simple Tests**: `simple-test.js` - Basic functionality tests
- **Comprehensive Tests**: `comprehensive-*.cjs` - Full system tests

## 📚 Documentation

- [Architecture Guide](docs/architecture/) - System architecture
- [User Guides](docs/guides/) - User documentation
- [Troubleshooting](docs/troubleshooting/) - Common issues and solutions
- [API Documentation](docs/api/) - API reference

## 🔧 Features

### Core Features
- **Call Analysis**: AI-powered transcription and analysis
- **Employee Tracking**: Comprehensive employee management
- **Performance Analytics**: Detailed performance metrics
- **Voice Recognition**: Employee voice identification
- **Coaching System**: Manager feedback and coaching tools

### Admin Features
- **Dashboard**: Comprehensive admin dashboard
- **User Management**: User role and permission management
- **System Monitoring**: Real-time system health monitoring
- **Analytics**: Advanced analytics and reporting

### Employee Features
- **Profile Management**: Employee profile management
- **Performance Tracking**: Individual performance metrics
- **Voice Training**: Voice profile training and recognition
- **Scorecard Management**: Performance scorecard system

## 🚀 Deployment

### Production Deployment
1. Build the application: `npm run build`
2. Deploy to your hosting platform
3. Configure environment variables
4. Run database migrations
5. Deploy Supabase Edge Functions

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [troubleshooting guide](docs/troubleshooting/)
- Review the [documentation](docs/)
- Open an issue on GitHub

## 🔄 Recent Updates

- ✅ **Codebase Cleanup**: Organized scripts and removed clutter
- ✅ **Employee Management**: Complete employee tracking system
- ✅ **Criteria Builder**: User-friendly rubric creation
- ✅ **Database Maintenance**: Consolidated database scripts
- ✅ **Testing Framework**: Unified testing utilities
