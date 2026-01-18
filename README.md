# 🎯 Audience Engagement Platform

A real-time AI-powered platform that monitors audience engagement during presentations, lectures, and meetings using computer vision and facial expression analysis.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-FF6F00?logo=tensorflow)
![tRPC](https://img.shields.io/badge/tRPC-11-2596BE)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [AI & Computer Vision](#-ai--computer-vision)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [License](#-license)

---

## 🔭 Overview

The **Audience Engagement Platform** helps speakers, educators, and presenters understand their audience in real-time. By analyzing facial expressions, head poses, and behavioral cues, the system calculates an **Engagement Score** and alerts the speaker when audience attention drops below a configurable threshold.

### Key Use Cases

- **Education**: Monitor student engagement during lectures
- **Corporate**: Track attention levels in meetings and training sessions
- **Events**: Gauge audience response during presentations and conferences

---

## ✨ Features

### 🎥 Real-Time Monitoring
- **Live Video Analysis**: Process webcam or phone camera feeds at 10+ FPS
- **Multi-Face Detection**: Track multiple audience members simultaneously
- **Engagement Scoring**: Calculate individual and aggregate engagement levels (0-100%)

### 🧠 AI-Powered Analysis
- **Facial Expression Recognition**: Detect 7 emotions (happy, sad, angry, surprised, fearful, disgusted, neutral)
- **Yawning Detection**: Using Mouth Aspect Ratio (MAR) algorithm
- **Head Pose Estimation**: Detect when audience members look down (inattention)
- **Engagement Classification**: Categorize as `engaged`, `neutral`, or `bored`

### 📱 Multi-Source Video Input
- **Webcam**: Direct browser camera access
- **Phone Camera**: Connect smartphone as wireless camera via WebRTC
- **Screen Share**: Monitor virtual meetings

### 🔔 Smart Alert System
- **Threshold Alerts**: Notify when boredom exceeds configurable percentage
- **Multi-Channel Delivery**: Visual, sound, vibration, and push notifications
- **Pushover Integration**: Send alerts to smartwatch/phone via Pushover API
- **Cooldown Logic**: Prevent alert fatigue with intelligent timing

### 📊 Analytics & Reports
- **Real-Time Charts**: Live engagement graphs with Recharts
- **Session History**: Review past sessions with detailed metrics
- **AI-Generated Insights**: Post-session reports with recommendations
- **Time-Series Data**: Track engagement patterns over session duration

---

## 🛠 Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework with latest features |
| **TypeScript 5.9** | Type-safe development |
| **Vite 7** | Fast build tool and dev server |
| **TailwindCSS 4** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **Radix UI** | Accessible component primitives |
| **Recharts** | Data visualization charts |
| **Wouter** | Lightweight routing |
| **React Hook Form + Zod** | Form handling with validation |
| **TanStack Query** | Server state management |

### Backend

| Technology | Purpose |
|------------|---------|
| **Express.js** | HTTP server framework |
| **tRPC 11** | End-to-end typesafe API |
| **Socket.io** | Real-time WebSocket communication |
| **Drizzle ORM** | Type-safe database queries |
| **MySQL 8** | Relational database |
| **AWS S3** | File storage (optional) |
| **Jose** | JWT authentication |

### AI & Computer Vision

| Technology | Purpose |
|------------|---------|
| **face-api.js** | Face detection and expression recognition |
| **TensorFlow.js 4.22** | ML runtime in browser |
| **MediaPipe** | Advanced face/pose detection (available) |

---

## 🏛 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │   Camera    │──▶│ FaceDetector│──▶│  useVideoProcessor  │   │
│  │   Stream    │   │  (face-api) │   │     (React Hook)    │   │
│  └─────────────┘   └─────────────┘   └──────────┬──────────┘   │
│                                                  │              │
│                                      ┌───────────▼───────────┐  │
│                                      │   EngagementMetrics   │  │
│                                      │  - totalFaces         │  │
│                                      │  - engagedCount       │  │
│                                      │  - boredCount         │  │
│                                      │  - boredomPercentage  │  │
│                                      └───────────┬───────────┘  │
│                                                  │              │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────▼──────────┐   │
│  │  LiveMonitor│◀──│ AlertManager│◀──│    tRPC Client      │   │
│  │    (UI)     │   │ (Pushover)  │   │                     │   │
│  └─────────────┘   └─────────────┘   └──────────┬──────────┘   │
│                                                  │              │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │
                              ┌─────────────────────────────────────┐
                              │            SERVER (Node.js)          │
                              ├─────────────────────────────────────┤
                              │                                     │
                              │  ┌─────────────┐  ┌──────────────┐  │
                              │  │ tRPC Router │  │  Socket.io   │  │
                              │  │  - sessions │  │  (Signaling) │  │
                              │  │  - users    │  │              │  │
                              │  │  - alerts   │  │              │  │
                              │  └──────┬──────┘  └──────────────┘  │
                              │         │                           │
                              │  ┌──────▼──────┐                    │
                              │  │ Drizzle ORM │                    │
                              │  └──────┬──────┘                    │
                              │         │                           │
                              └─────────┼───────────────────────────┘
                                        │
                              ┌─────────▼─────────┐
                              │      MySQL        │
                              │  - users          │
                              │  - sessions       │
                              │  - engagementData │
                              │  - faceAnalysis   │
                              │  - alerts         │
                              └───────────────────┘
```

---

## 🧠 AI & Computer Vision

### Face Detection Pipeline

The system uses **face-api.js** built on TensorFlow.js with three neural networks:

1. **TinyFaceDetector** (`inputSize: 416, scoreThreshold: 0.5`)  
   A lightweight MobileNet-based detector for real-time face localization.

2. **FaceLandmark68Net**  
   Detects 68 facial landmarks (eyes, nose, mouth, jawline) for geometric analysis.

3. **FaceExpressionNet**  
   Classifies facial expressions into 7 categories with confidence scores:
   - `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`, `neutral`

### Engagement Calculation Algorithm

```typescript
// Base score starts at 100
let score = 100;

// Expression-based adjustments
if (expressions.sad > 0.5) score -= 20;
if (expressions.angry > 0.5) score -= 15;
if (expressions.neutral > 0.7) score -= 10;
if (expressions.happy > 0.5) score += 15;
if (expressions.surprised > 0.3) score += 10;

// Behavioral indicators
if (isYawning) score -= 30;      // Mouth Aspect Ratio > 0.6
if (isLookingDown) score -= 20;  // Head pitch detection

// Classification thresholds
if (score >= 70) return 'engaged';
if (score < 50) return 'bored';
return 'neutral';
```

### Yawning Detection (MAR Algorithm)

```
MAR = Vertical Mouth Distance / Horizontal Mouth Distance

Using landmarks:
- Vertical: distance(mouth[3], mouth[9])  // top to bottom lip
- Horizontal: distance(mouth[0], mouth[6]) // left to right corner

MAR > 0.6 → Yawning detected
```

### Looking Down Detection

```
Uses nose and jaw landmarks to estimate head pitch:
- noseToChingRatio = (chin.y - noseTip.y) / faceHeight
- Ratio < 0.28 → Looking down (potential inattention)
```

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    users    │       │     sessions     │       │ engagementData  │
├─────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)     │◀──────│ speakerId (FK)   │       │ id (PK)         │
│ openId      │       │ id (PK)          │◀──────│ sessionId (FK)  │
│ name        │       │ title            │       │ timestamp       │
│ email       │       │ description      │       │ totalFaces      │
│ role        │       │ status           │       │ boredCount      │
│ loginMethod │       │ alertThreshold   │       │ engagedCount    │
│ lastSignedIn│       │ startTime        │       │ boredomPercentage│
└─────────────┘       │ endTime          │       └─────────────────┘
       │              └──────────────────┘
       │                      │
       │              ┌───────┴───────┐
       ▼              ▼               ▼
┌──────────────┐  ┌────────────┐  ┌──────────────┐
│notification  │  │   alerts   │  │ faceAnalysis │
│Preferences   │  ├────────────┤  ├──────────────┤
├──────────────┤  │ id (PK)    │  │ id (PK)      │
│ userId (FK)  │  │ sessionId  │  │ sessionId    │
│ enableSound  │  │ userId     │  │ faceIndex    │
│ enableVisual │  │ alertType  │  │ emotionLabel │
│ enablePush   │  │ message    │  │ isYawning    │
└──────────────┘  │ delivered  │  │ isLookingDown│
                  └────────────┘  │engagementScore│
                                  └──────────────┘
```

### Tables Summary

| Table | Purpose |
|-------|---------|
| `users` | User accounts with OAuth (openId) |
| `sessions` | Presentation/meeting sessions |
| `sessionAssistants` | Team members receiving alerts |
| `notificationPreferences` | Per-user alert settings |
| `engagementData` | Aggregated metrics per timestamp |
| `faceAnalysis` | Individual face detection records |
| `alerts` | Alert history and delivery status |
| `sessionReports` | AI-generated post-session summaries |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **MySQL** 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/audience-engagement-platform.git
cd audience-engagement-platform

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

```env
DATABASE_URL=mysql://user:password@localhost:3306/audience_db
OWNER_OPEN_ID=your-admin-user-id
```

---

## 📁 Project Structure

```
├── client/                    # Frontend React application
│   ├── public/
│   │   └── models/           # face-api.js model weights
│   └── src/
│       ├── components/       # Reusable UI components
│       │   ├── ui/          # Radix-based primitives
│       │   ├── AIChatBox.tsx
│       │   ├── PhoneCameraModal.tsx
│       │   └── PushoverSettings.tsx
│       ├── hooks/
│       │   ├── useVideoProcessor.ts    # Main AI processing hook
│       │   └── useComposition.ts
│       ├── lib/
│       │   ├── faceDetector.ts         # Face detection class
│       │   ├── alertManager.ts         # Alert system
│       │   └── webrtcPhoneCamera.ts    # Phone camera WebRTC
│       ├── pages/
│       │   ├── LiveMonitor.tsx         # Main monitoring UI
│       │   ├── Analytics.tsx           # Charts & reports
│       │   ├── Sessions.tsx            # Session management
│       │   ├── Settings.tsx            # User preferences
│       │   └── VideoSources.tsx        # Camera selection
│       └── contexts/
│           └── ThemeContext.tsx
│
├── server/                    # Backend Node.js application
│   ├── _core/                # Core utilities
│   │   ├── index.ts          # Express server setup
│   │   ├── trpc.ts           # tRPC configuration
│   │   ├── llm.ts            # LLM integration
│   │   └── signaling.ts      # WebRTC signaling
│   ├── db.ts                 # Database operations
│   ├── routers.ts            # tRPC routers
│   ├── signaling.ts          # Socket.io handlers
│   └── storage.ts            # File storage (S3)
│
├── drizzle/                   # Database schema & migrations
│   ├── schema.ts             # Table definitions
│   └── migrations/           # SQL migration files
│
├── shared/                    # Shared types (client & server)
│
├── package.json
├── vite.config.ts
├── drizzle.config.ts
└── tsconfig.json
```

---

## 📡 API Reference

### tRPC Endpoints

#### Sessions
| Procedure | Type | Description |
|-----------|------|-------------|
| `sessions.create` | Mutation | Create new session |
| `sessions.getById` | Query | Get session details |
| `sessions.getBySpeaker` | Query | List speaker's sessions |
| `sessions.updateStatus` | Mutation | Update session status |
| `sessions.updateAlertThreshold` | Mutation | Set alert threshold |

#### Engagement
| Procedure | Type | Description |
|-----------|------|-------------|
| `engagement.record` | Mutation | Save engagement data point |
| `engagement.getBySession` | Query | Get session metrics |
| `engagement.getInRange` | Query | Get metrics in time range |

#### Alerts
| Procedure | Type | Description |
|-----------|------|-------------|
| `alerts.create` | Mutation | Create new alert |
| `alerts.markDelivered` | Mutation | Mark alert as sent |
| `alerts.getBySession` | Query | Get session alerts |

---

## ⚙ Configuration

### Alert Settings

```typescript
interface AlertSettings {
  enabled: boolean;
  threshold: number;           // 0-100, default: 40
  cooldownMs: number;          // Minimum time between alerts
  enableVibration: boolean;
  enableSound: boolean;
  enableVisual: boolean;
  pushoverApiToken?: string;   // For push notifications
  pushoverUserKey?: string;
}
```

### Video Processing

```typescript
// In useVideoProcessor.ts
const PROCESSING_INTERVAL = 100; // Process every 100ms (~10 FPS)

// In faceDetector.ts
const detectorOptions = {
  inputSize: 416,           // Detection resolution
  scoreThreshold: 0.5,      // Minimum confidence
};
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest run server/engagement.test.ts
```

### Test Files

| File | Coverage |
|------|----------|
| `engagement.test.ts` | Engagement data recording |
| `sessions.test.ts` | Session CRUD operations |
| `phoneCamera.test.ts` | WebRTC phone connection |
| `signaling.test.ts` | Socket.io signaling |
| `fidgetIndex.test.ts` | Engagement algorithm |

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Support

For questions and support, please open an issue on GitHub.

---

**Built with ❤️ for better audience engagement**
