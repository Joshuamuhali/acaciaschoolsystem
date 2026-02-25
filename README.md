# 🏫 Acacia Country School Management System

A comprehensive, production-ready school management system built with modern web technologies for efficient administration of pupils, grades, fees, and financial reporting.

## 🌟 Features

### 👨‍🎓 Pupil Management
- **Complete CRUD Operations**: Add, edit, delete, and view pupil records
- **Grade Assignment**: Assign pupils to grades with proper relationships
- **Status Tracking**: Track pupil status (New, Admitted, Old)
- **Search & Filtering**: Real-time search and grade-based filtering
- **Profile Management**: Comprehensive pupil profiles with contact information

### 📚 Grade Management
- **Grade Administration**: Create and manage grade levels and sections
- **Pupil Relationships**: Maintain proper pupil-grade associations
- **Settings Management**: Configure grade-specific fee settings
- **Statistics**: View pupil counts and distribution per grade

### 💰 Financial Management
- **School Fees**: Preset ZMW 2,400 per term with automatic calculations
- **Other Fees**: Custom fee types (exam, sports, library, etc.)
- **Payment Processing**: Full payment tracking with RCT numbers
- **Balance Management**: Real-time balance calculations and updates
- **Manual Adjustments**: Direct balance editing capabilities

### 📊 Reporting & Analytics
- **Outstanding Reports**: Grade-wise outstanding balance reports
- **Collection Reports**: Term-based collection analytics
- **Pupil Statements**: Individual pupil payment histories
- **CSV Exports**: Export all reports to CSV format
- **Dashboard Analytics**: Real-time financial overview and statistics

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL + Real-time)
- **State Management**: React Query (TanStack)
- **Routing**: React Router v6
- **Icons**: Lucide React

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Joshuamuhali/acaciaschoolsystem.git
   cd acaciaschoolsystem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment file
   cp .env.example .env

   # Configure Supabase credentials in .env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   Navigate to http://localhost:5173
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations in `/supabase/migrations/`
3. Configure Row Level Security (RLS) policies
4. Enable real-time subscriptions for required tables

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...
├── pages/              # Route components
│   ├── Dashboard.tsx
│   ├── Pupils.tsx
│   ├── Grades.tsx
│   └── ...
├── services/           # API and data services
│   ├── pupils.ts
│   ├── grades.ts
│   ├── fees.ts
│   └── ...
├── layouts/            # Layout components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── types/              # TypeScript type definitions
```

## 🏗️ Architecture

- **Modular Design**: Clean separation of concerns with service layers
- **Type Safety**: Full TypeScript coverage for reliable development
- **Real-time Updates**: Live data synchronization via Supabase subscriptions
- **Responsive UI**: Mobile-first design with Tailwind CSS
- **Error Handling**: Comprehensive error boundaries and user feedback

## 🚢 Deployment

### Production Build

```bash
npm run build
```

### Deploy to Production

The application can be deployed to any static hosting service:

- **Vercel**: Connect your GitHub repository for automatic deployments
- **Netlify**: Drag & drop the `dist` folder or connect via Git
- **GitHub Pages**: Use GitHub Actions for automated deployment

### Environment Configuration

Ensure production environment variables are set in your hosting platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Guidelines

- **Code Style**: Follow the existing TypeScript and React patterns
- **Commits**: Use conventional commit messages
- **Testing**: Test all features before submitting PRs
- **Documentation**: Update README for any new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support or questions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for Acacia Country School**
