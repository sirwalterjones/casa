# CASA Case Management System

A comprehensive case management platform built specifically for Court Appointed Special Advocate (CASA) programs. This system provides complete case tracking, volunteer management, and court documentation tools to support child welfare advocacy.

## 🚀 Overview

This platform combines the power of WordPress as a headless CMS with a modern React frontend to create a specialized case management solution for CASA organizations. Each organization gets their own isolated environment while maintaining data security and compliance.

### Key Features

- **Comprehensive Case Management** - Track cases from intake to closure
- **Volunteer Coordination** - Manage volunteer assignments and training
- **Contact Logging** - Document home visits, phone calls, and court appearances
- **Court Integration** - Schedule hearings and track court documents
- **Secure Document Management** - Store and organize case-related files
- **Child Welfare Focus** - Specialized forms and workflows for child advocacy
- **Multi-Organization Support** - Complete data isolation between CASA programs
- **Compliance Ready** - HIPAA-compliant data protection and audit trails

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with SSR support
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form handling and validation
- **React Query** - Data fetching and caching
- **Axios** - HTTP client

### Backend
- **WordPress** - Headless CMS and API server
- **Formidable Forms Pro** - Case intake and contact logging forms
- **JWT Authentication** - Secure API authentication
- **MySQL** - Database storage
- **Custom PHP Plugin** - CASA-specific functionality and multi-organization logic

### Hosting & Deployment (FedRAMP Moderate)
- **Google Cloud Run** - Frontend and backend hosting (FedRAMP authorized)
- **Google Cloud SQL** - MySQL database with encryption at rest
- **Google Secret Manager** - Secure credential storage
- **Google Artifact Registry** - Container image storage with scanning

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- WordPress hosting environment
- Formidable Forms Pro license
- Basic knowledge of React and WordPress

## 🚀 Quick Start

### 1. Clone and Install Frontend

```bash
# Clone the repository
git clone <your-repo-url>
cd casa

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env.local

# Edit .env.local with your WordPress backend URL and credentials
```

### 2. Set Up WordPress Backend

Follow the detailed [WordPress Setup Guide](./WORDPRESS_SETUP.md) to:

1. Install WordPress with required plugins
2. Configure JWT authentication
3. Set up multi-tenancy plugin
4. Configure Formidable Forms Pro
5. Enable CORS for API access

### 3. Configure Environment Variables

Edit `.env.local` with your settings:

```env
WORDPRESS_API_URL=https://your-wordpress-site.com
JWT_SECRET=your-super-secret-key
NEXTAUTH_SECRET=your-nextauth-secret
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## 📁 Project Structure

```
casa/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   │   ├── cases/          # Case management components
│   │   ├── volunteers/     # Volunteer management components
│   │   ├── dashboard/      # Dashboard-specific components
│   │   └── common/         # Shared components
│   ├── pages/              # Next.js pages
│   │   ├── auth/          # Authentication pages
│   │   ├── dashboard/     # Dashboard pages
│   │   ├── cases/         # Case management pages
│   │   ├── volunteers/    # Volunteer management pages
│   │   ├── documents/     # Document management pages
│   │   └── court-hearings/ # Court hearing pages
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services and utilities
│   ├── types/             # TypeScript type definitions (CASA-specific)
│   ├── utils/             # Helper functions and constants
│   └── styles/            # Global styles and Tailwind config
├── wordpress-backend/      # WordPress backend files
├── PRD.md                 # Product Requirements Document
├── WORDPRESS_SETUP.md     # Detailed backend setup guide
└── README.md              # This file
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Key Development Files

- **API Client**: `src/services/apiClient.ts` - Handles all API communication
- **Authentication**: `src/services/authService.ts` - User authentication logic
- **Case Service**: `src/services/caseService.ts` - Case management operations
- **Volunteer Service**: `src/services/volunteerService.ts` - Volunteer management
- **Organization Service**: `src/services/organizationService.ts` - Multi-organization functionality
- **Auth Hook**: `src/hooks/useAuth.ts` - Authentication state management

## 🏗 Architecture

### CASA Organization Data Flow

```
Frontend (React) → API Client → WordPress REST API → CASA Plugin → Database
```

### Authentication Flow

1. User logs in with email/password + CASA program identifier
2. WordPress validates credentials and returns JWT token
3. Token is stored and included in subsequent API requests
4. Organization context is maintained throughout the session

### Data Isolation

- Each CASA organization's data is completely isolated using organization_id fields
- Subdomain routing determines organization context
- Role-based permissions control access within organizations
- Secure handling of sensitive child welfare information

## 🔐 Security

### FedRAMP Moderate Compliance

This system is deployed on Google Cloud Platform services that are FedRAMP Moderate authorized:

| Control | Implementation |
|---------|----------------|
| **Region** | us-east4 (FedRAMP authorized) |
| **Compute** | Cloud Run (gen2 execution environment) |
| **Database** | Cloud SQL with encryption at rest |
| **Secrets** | Secret Manager for all credentials |
| **Container Registry** | Artifact Registry with vulnerability scanning |
| **Audit Logging** | Cloud Audit Logs enabled |
| **Encryption** | TLS 1.2+ in transit, AES-256 at rest |

### Authentication & Authorization
- JWT tokens for API authentication
- Role-based access control (RBAC)
- Tenant-level data isolation
- Secure password requirements
- Email-based 2FA authentication

### File Upload Security
- File type validation
- Size limits enforcement
- Secure storage paths (GCS with encryption)
- Malware scanning (recommended)

### API Security
- CORS configuration
- Rate limiting (recommended)
- Input sanitization
- SQL injection prevention

## 🌐 Deployment

### Frontend Deployment (Vercel)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Ensure WORDPRESS_API_URL points to your production WordPress

3. **Custom Domain** (Optional)
   - Configure custom domain in Vercel
   - Update CORS settings in WordPress

### Backend Deployment

Choose one of these WordPress hosting options:

1. **Managed WordPress Hosting** (Recommended)
   - WP Engine, Kinsta, or Pantheon
   - Automatic updates and security
   - Optimized for performance

2. **VPS Hosting**
   - DigitalOcean, Linode, or AWS
   - Full control over environment
   - Requires server management

3. **Shared Hosting**
   - Budget-friendly option
   - Limited customization
   - May have performance constraints

## 📊 Features Deep Dive

### Case Management
- Complete case lifecycle tracking from intake to closure
- Child information and placement history
- Case goals and milestones
- Court hearing scheduling and tracking
- Case status updates and notifications

### Volunteer Management
- Volunteer profile and contact information
- Training record tracking and certification management
- Background check status monitoring
- Case assignment and availability tracking
- Performance and activity reports

### Contact Logging
- Home visit documentation
- Phone call and email tracking
- Court hearing attendance
- School visit records
- Follow-up action tracking

### Document Management
- Secure storage for court orders and legal documents
- Medical and school record organization
- Case plan and report management
- Photo and evidence storage
- Access control and audit trails

### Court Integration
- Hearing calendar and deadline tracking
- Court report generation
- Judge and attorney contact management
- Hearing outcome documentation
- Legal timeline tracking

### Multi-Organization Support
- Complete data isolation between CASA programs
- Custom branding per organization
- Subdomain routing for organizations
- Organization-specific settings and workflows
- Resource usage and compliance tracking

## 🔍 Monitoring & Analytics

### Error Tracking
- Client-side error tracking (Sentry recommended)
- Server-side error logging
- Performance monitoring
- User activity tracking

### CASA Program Metrics
- Case closure rates and outcomes
- Volunteer engagement and retention
- Court hearing compliance
- Child welfare indicators
- Program effectiveness tracking

## 🛡 Backup & Recovery

### Database Backups
- Daily automated backups
- Point-in-time recovery
- Offsite backup storage
- Backup verification

### File Backups
- User uploads backup
- WordPress files backup
- Configuration backup
- Restoration procedures

## 🔄 Updates & Maintenance

### WordPress Maintenance
- Core WordPress updates
- Plugin updates
- Security patches
- Performance optimization

### Frontend Maintenance
- Dependency updates
- Security vulnerability patches
- Performance improvements
- Feature enhancements

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration in WordPress
   - Verify frontend domain is whitelisted
   - Check browser console for specific errors

2. **Authentication Issues**
   - Verify JWT secret key configuration
   - Check token expiration
   - Validate user permissions

3. **API Connection Issues**
   - Verify WordPress API endpoints
   - Check network connectivity
   - Validate SSL certificates

### Debug Mode

Enable debug mode for development:

```env
DEBUG=true
NODE_ENV=development
```

## 📚 Documentation

- [Product Requirements Document](./PRD.md) - Detailed project requirements
- [WordPress Setup Guide](./WORDPRESS_SETUP.md) - Backend configuration
- [API Documentation](./API_DOCS.md) - API endpoints and usage
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment steps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

1. **Documentation** - Check this README and linked guides
2. **Issues** - Create GitHub issues for bugs or feature requests
3. **Discussions** - Use GitHub Discussions for questions
4. **Email** - Contact support@yourapp.com

### Community Resources

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Formidable Forms Documentation](https://formidableforms.com/knowledgebase/)
- [React Hook Form Documentation](https://react-hook-form.com/)

## 🗺 Roadmap

### Phase 1 - Foundation (Current)
- ✅ Multi-organization architecture
- ✅ CASA-specific types and data models
- ✅ User authentication system
- ✅ Basic dashboard with activity tracking
- ✅ Secure file upload capabilities

### Phase 2 - Core CASA Features
- [ ] Case intake and management system
- [ ] Contact logging with home visit tracking
- [ ] Volunteer management and assignment
- [ ] Court hearing calendar and tracking
- [ ] Document management with court orders

### Phase 3 - Advanced CASA Tools
- [ ] Court report generation
- [ ] Case outcome analytics and reporting
- [ ] Mobile app for volunteer field work
- [ ] Integration with court management systems
- [ ] Automated compliance and audit reporting

---

**Ready to transform your CASA program?** Follow the [WordPress Setup Guide](./WORDPRESS_SETUP.md) to get started with the backend configuration and begin helping more children through better case management!