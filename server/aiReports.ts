import { invokeLLM } from './_core/llm';
import * as db from './db';

export interface SessionInsights {
  overallEngagement: number;
  peakEngagementTime: Date;
  lowestEngagementTime: Date;
  insights: string;
  recommendations: string;
  successfulMoments: string[];
  improvementAreas: string[];
}

export async function generateSessionReport(sessionId: number): Promise<SessionInsights> {
  // Fetch session data
  const session = await db.getSessionById(sessionId);
  const engagementData = await db.getEngagementDataBySession(sessionId);
  const alerts = await db.getAlertsBySession(sessionId);

  if (!session || !engagementData || engagementData.length === 0) {
    throw new Error('Insufficient data to generate report');
  }

  // Calculate statistics
  const avgEngagement = engagementData.reduce((sum, d) => sum + d.averageEngagementScore, 0) / engagementData.length;
  const avgBoredom = engagementData.reduce((sum, d) => sum + d.boredomPercentage, 0) / engagementData.length;
  
  const peakData = engagementData.reduce((max, d) => 
    d.averageEngagementScore > max.averageEngagementScore ? d : max
  );
  
  const lowestData = engagementData.reduce((min, d) => 
    d.averageEngagementScore < min.averageEngagementScore ? d : min
  );

  // Calculate engagement variance (how much it fluctuated)
  const variance = engagementData.reduce((sum, d) => {
    const diff = d.averageEngagementScore - avgEngagement;
    return sum + (diff * diff);
  }, 0) / engagementData.length;
  const stdDev = Math.sqrt(variance);

  // Identify engagement trends
  const firstHalf = engagementData.slice(0, Math.floor(engagementData.length / 2));
  const secondHalf = engagementData.slice(Math.floor(engagementData.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.averageEngagementScore, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.averageEngagementScore, 0) / secondHalf.length;
  const trend = secondHalfAvg - firstHalfAvg;

  // Prepare context for LLM
  const sessionDuration = session.endTime && session.startTime 
    ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 / 60
    : 0;

  const context = `
Session Analysis Data:
- Title: ${session.title}
- Duration: ${Math.round(sessionDuration)} minutes
- Average Engagement Score: ${Math.round(avgEngagement)}%
- Average Boredom Level: ${Math.round(avgBoredom)}%
- Peak Engagement: ${Math.round(peakData.averageEngagementScore)}% at ${new Date(peakData.timestamp).toLocaleTimeString()}
- Lowest Engagement: ${Math.round(lowestData.averageEngagementScore)}% at ${new Date(lowestData.timestamp).toLocaleTimeString()}
- Engagement Stability: ${stdDev < 10 ? 'Very Stable' : stdDev < 20 ? 'Moderately Stable' : 'Highly Variable'}
- Trend: ${trend > 5 ? 'Improving' : trend < -5 ? 'Declining' : 'Stable'} (${trend > 0 ? '+' : ''}${Math.round(trend)}%)
- Total Alerts Triggered: ${alerts.length}
- Alert Threshold: ${session.alertThreshold}%

Data Points: ${engagementData.length} measurements over ${Math.round(sessionDuration)} minutes
`;

  // Generate insights using LLM
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are an expert presentation coach and audience engagement analyst. Analyze the session data and provide actionable insights and recommendations. Be specific, constructive, and encouraging. Focus on what worked well and concrete steps for improvement.`
      },
      {
        role: 'user',
        content: `${context}

Please provide:
1. A comprehensive analysis of the session's engagement patterns
2. Specific recommendations for improving audience engagement
3. 3-5 successful moments or techniques that worked well
4. 3-5 areas for improvement with actionable suggestions

Format your response as JSON with these fields:
{
  "insights": "detailed analysis paragraph",
  "recommendations": "actionable recommendations paragraph",
  "successfulMoments": ["moment 1", "moment 2", ...],
  "improvementAreas": ["area 1", "area 2", ...]
}`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'session_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            insights: { type: 'string' },
            recommendations: { type: 'string' },
            successfulMoments: {
              type: 'array',
              items: { type: 'string' }
            },
            improvementAreas: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['insights', 'recommendations', 'successfulMoments', 'improvementAreas'],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  const aiAnalysis = typeof content === 'string' ? JSON.parse(content) : null;
  
  if (!aiAnalysis) {
    throw new Error('Failed to parse AI response');
  }

  return {
    overallEngagement: avgEngagement,
    peakEngagementTime: new Date(peakData.timestamp),
    lowestEngagementTime: new Date(lowestData.timestamp),
    insights: aiAnalysis.insights,
    recommendations: aiAnalysis.recommendations,
    successfulMoments: aiAnalysis.successfulMoments,
    improvementAreas: aiAnalysis.improvementAreas,
  };
}
