# Audience Engagement Platform

A real-time audience engagement monitoring system that uses computer vision and AI to help speakers detect and respond to audience disengagement during presentations.

## Features

### 🎥 Real-Time Video Analysis
- Process video streams from webcams, IP cameras, or video files
- Advanced face and pose detection using MediaPipe and TensorFlow.js
- Multi-face tracking and analysis in real-time

### 😊 Emotion & Engagement Detection
- Detect boredom through facial expressions (yawning, frowning, looking down)
- Analyze body posture indicators (slumped shoulders, head position)
- Calculate real-time engagement scores for each audience member
- Aggregate metrics showing overall audience sentiment

### 🔔 Smart Alert System
- Configurable alert thresholds (e.g., alert when 40% of audience is disengaged)
- Multi-channel notifications:
  - Phone vibration (via browser Vibration API)
  - Sound alerts with customizable tones
  - Visual dashboard indicators
  - Email notifications
  - Push notifications
- Customizable notification preferences per user

### 📊 Live Engagement Dashboard
- Real-time engagement metrics and boredom percentages
- Live video feed with detected faces overlay
- Color-coded engagement indicators (green=engaged, yellow=neutral, red=bored)
- Adjustable alert threshold controls
- Audience breakdown by engagement level

### 📈 Session Analytics
- Comprehensive post-session analytics
- Engagement trends over time with Chart.js visualizations
- Peak and lowest engagement moments
- Session duration and statistics
- Historical data for all sessions

### 🤖 AI-Powered Insights
- Automated post-presentation report generation using LLM
- Actionable recommendations for improvement
- Identification of successful moments
- Areas for improvement with specific suggestions
- Exportable reports for future reference

### 👥 Team Collaboration
- Designate assistants to receive alerts alongside the speaker
- Role-based access control (speaker, assistant, admin)
- Session sharing and management

## Getting Started

### Prerequisites
- Modern web browser with webcam access
- Manus account for authentication

### Quick Start

1. **Sign In**
   - Visit the platform and sign in with your Manus account
   - Grant camera permissions when prompted

2. **Create a Session**
   - Click "New Session" on the Sessions page
   - Enter a title and description
   - Set your alert threshold (default: 40%)
   - Click "Create Session"

3. **Start Monitoring**
   - Click "Start" on your session
   - Click "Monitor" to open the live monitoring dashboard
   - Click "Start Camera" to begin video analysis
   - Present while monitoring real-time engagement metrics

4. **Review Analytics**
   - After ending your session, click "View Report"
   - Generate AI-powered insights
   - Review engagement trends and recommendations

## How It Works

### Video Processing Pipeline

1. **Video Capture**: Captures frames from your webcam or video source
2. **Face Detection**: Uses MediaPipe to detect all faces in the frame
3. **Pose Analysis**: Analyzes body posture and head position
4. **Emotion Recognition**: Evaluates facial expressions and behavioral cues
5. **Engagement Scoring**: Calculates individual and aggregate engagement scores
6. **Alert Triggering**: Compares boredom percentage to threshold and triggers alerts

### Engagement Scoring Algorithm

Each detected face receives an engagement score (0-100) based on:
- **Head Position**: Looking down reduces score by 30 points
- **Facial Expression**: Yawning reduces score by 20 points
- **Body Posture**: Slumped posture reduces score by 20 points
- **Base Score**: Starts at 50 points

Engagement levels:
- **Engaged**: Score ≥ 70 (Green)
- **Neutral**: Score 40-69 (Yellow)
- **Bored**: Score < 40 (Red)

### Alert System

Alerts are triggered when:
- Boredom percentage exceeds your configured threshold
- At least 30 seconds have passed since the last alert (to avoid spam)
- At least one face is detected in the frame

Alert delivery includes:
- Visual notification on dashboard (pulsing red indicator)
- Browser vibration (if enabled and supported)
- Sound alert (if enabled)
- Toast notification with boredom percentage
- Database logging for post-session review

## Configuration

### Notification Preferences

Navigate to Settings to configure:
- **Vibration Alerts**: Enable/disable device vibration
- **Sound Alerts**: Enable/disable and choose sound type (default, gentle, urgent, chime)
- **Visual Alerts**: Enable/disable dashboard indicators
- **Email Notifications**: Enable/disable email alerts
- **Push Notifications**: Enable/disable push notifications

### Session Settings

For each session, you can configure:
- **Alert Threshold**: Percentage of disengaged audience that triggers alerts (10-90%)
- **Title & Description**: Identify your session
- **Assistants**: Add team members to receive alerts

## Best Practices

### Camera Placement
- Position camera to capture audience faces clearly
- Ensure adequate lighting for face detection
- Avoid backlighting or harsh shadows
- Test camera angle before starting

### Using Alerts Effectively
- Set realistic thresholds based on audience size (larger audiences may have more variation)
- Don't over-react to single alerts - look for patterns
- Use alerts as cues to check in with audience, ask questions, or change pace
- Review analytics after sessions to identify trends

### Improving Engagement
Based on AI analysis, common recommendations include:
- Incorporate interactive elements (questions, polls, discussions)
- Use visual aids and demonstrations
- Vary your pacing and tone
- Monitor body language and adjust accordingly
- Take breaks during longer sessions
- Make eye contact and engage directly with audience

## Technical Details

### Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Node.js, Express, tRPC 11
- **Database**: MySQL/TiDB
- **Computer Vision**: MediaPipe, TensorFlow.js
- **AI**: LLM integration for report generation
- **Charts**: Chart.js, react-chartjs-2
- **Authentication**: Manus OAuth

### Browser Compatibility
- Chrome/Edge 90+ (recommended)
- Firefox 88+
- Safari 14+
- Requires webcam access and modern JavaScript support

### Performance
- Processes 15-30 frames per second depending on hardware
- Supports 1-50 simultaneous face detections
- Records engagement data every 5 seconds
- Minimal latency for real-time alerts

## Privacy & Security

- All video processing happens locally in your browser
- No video data is stored or transmitted to servers
- Only aggregate engagement metrics are saved to database
- User authentication via secure Manus OAuth
- Role-based access control for data protection

## Support

For issues, questions, or feature requests, please contact support through the Manus platform.

## License

Proprietary - All rights reserved
