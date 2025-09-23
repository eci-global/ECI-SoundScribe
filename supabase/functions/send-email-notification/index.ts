import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailData {
  to: string;
  recordingTitle: string;
  summary: string;
  coachingEvaluation?: any;
  recordingUrl?: string;
  pdfUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      recordingTitle, 
      summary, 
      coachingEvaluation,
      recordingUrl,
      pdfUrl 
    }: EmailData = await req.json();

    console.log('Sending email notification to:', to);

    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    // Generate email content based on whether it's a coaching evaluation or regular summary
    const emailContent = generateEmailContent({
      recordingTitle,
      summary,
      coachingEvaluation,
      recordingUrl,
      pdfUrl
    });

    const emailData = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: coachingEvaluation 
            ? `Sales Call Analysis: ${recordingTitle} (Score: ${coachingEvaluation.overallScore}/100)`
            : `Recording Summary: ${recordingTitle}`
        }
      ],
      from: {
        email: 'noreply@soundscribe.app',
        name: 'SoundScribe AI Coach'
      },
      content: [
        {
          type: 'text/html',
          value: emailContent.html
        },
        {
          type: 'text/plain',
          value: emailContent.text
        }
      ]
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid API error:', errorText);
      throw new Error(`Email sending failed: ${response.statusText}`);
    }

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateEmailContent({ 
  recordingTitle, 
  summary, 
  coachingEvaluation,
  recordingUrl,
  pdfUrl 
}: Omit<EmailData, 'to'>) {
  if (coachingEvaluation) {
    return generateCoachingEmailContent({
      recordingTitle,
      summary,
      coachingEvaluation,
      recordingUrl,
      pdfUrl
    });
  } else {
    return generateSummaryEmailContent({
      recordingTitle,
      summary,
      recordingUrl,
      pdfUrl
    });
  }
}

function generateCoachingEmailContent({
  recordingTitle,
  summary,
  coachingEvaluation,
  recordingUrl,
  pdfUrl
}: Omit<EmailData, 'to'>) {
  const scoreColor = coachingEvaluation.overallScore >= 80 ? '#16a34a' : 
                    coachingEvaluation.overallScore >= 60 ? '#ca8a04' : '#dc2626';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Call Analysis</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">📊 Sales Call Analysis</h1>
            <p style="color: #6b7280; margin: 8px 0 0; font-size: 16px;">${recordingTitle}</p>
        </div>

        <!-- Overall Score -->
        <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
            <h2 style="margin: 0 0 12px; font-size: 20px; color: #374151;">Overall Performance Score</h2>
            <div style="font-size: 48px; font-weight: 800; color: ${scoreColor}; margin: 12px 0;">
                ${coachingEvaluation.overallScore}/100
            </div>
            <div style="background-color: #e5e7eb; border-radius: 8px; height: 8px; margin: 16px auto; width: 200px;">
                <div style="background-color: ${scoreColor}; height: 8px; border-radius: 8px; width: ${coachingEvaluation.overallScore * 2}px;"></div>
            </div>
        </div>

        <!-- Performance Breakdown -->
        <div style="margin-bottom: 32px;">
            <h3 style="color: #1f2937; margin-bottom: 16px; font-size: 18px; font-weight: 600;">📈 Performance Breakdown</h3>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500;">Talk-Time Ratio</span>
                        <span style="color: ${coachingEvaluation.criteria.talkTimeRatio >= 30 && coachingEvaluation.criteria.talkTimeRatio <= 40 ? '#16a34a' : '#ca8a04'};">${coachingEvaluation.criteria.talkTimeRatio}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500;">Objection Handling</span>
                        <span>${coachingEvaluation.criteria.objectionHandling}/10</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500;">Value Articulation</span>
                        <span>${coachingEvaluation.criteria.valueArticulation}/10</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500;">Discovery Questions</span>
                        <span>${coachingEvaluation.criteria.discoveryQuestions}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                        <span style="font-weight: 500;">Next Steps Established</span>
                        <span style="color: ${coachingEvaluation.criteria.nextSteps ? '#16a34a' : '#dc2626'};">${coachingEvaluation.criteria.nextSteps ? '✅' : '❌'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Strengths -->
        <div style="margin-bottom: 24px;">
            <h3 style="color: #16a34a; margin-bottom: 12px; font-size: 16px; font-weight: 600;">💪 What You Did Well</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${coachingEvaluation.strengths.map((strength: string) => `<li style="margin-bottom: 8px;">${strength}</li>`).join('')}
            </ul>
        </div>

        <!-- Improvements -->
        <div style="margin-bottom: 24px;">
            <h3 style="color: #ca8a04; margin-bottom: 12px; font-size: 16px; font-weight: 600;">🎯 Areas for Improvement</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${coachingEvaluation.improvements.map((improvement: string) => `<li style="margin-bottom: 8px;">${improvement}</li>`).join('')}
            </ul>
        </div>

        <!-- Action Items -->
        <div style="margin-bottom: 32px;">
            <h3 style="color: #2563eb; margin-bottom: 12px; font-size: 16px; font-weight: 600;">📋 Action Items for Next Call</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${coachingEvaluation.actionItems.map((item: string) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
            </ul>
        </div>

        <!-- Call Summary -->
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
            <h3 style="color: #1f2937; margin-bottom: 12px; font-size: 16px; font-weight: 600;">📝 Call Summary</h3>
            <div style="color: #4b5563; white-space: pre-line; font-size: 14px; line-height: 1.6;">${summary}</div>
        </div>

        <!-- Action Buttons -->
        <div style="text-align: center; margin-top: 32px;">
            ${recordingUrl ? `<a href="${recordingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">🎧 Listen to Recording</a>` : ''}
            ${pdfUrl ? `<a href="${pdfUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">📄 Download PDF</a>` : ''}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">Generated by SoundScribe AI Coach</p>
            <p style="margin: 8px 0 0;">Keep improving, one call at a time! 🚀</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
SALES CALL ANALYSIS: ${recordingTitle}

OVERALL SCORE: ${coachingEvaluation.overallScore}/100

PERFORMANCE BREAKDOWN:
- Talk-Time Ratio: ${coachingEvaluation.criteria.talkTimeRatio}%
- Objection Handling: ${coachingEvaluation.criteria.objectionHandling}/10
- Value Articulation: ${coachingEvaluation.criteria.valueArticulation}/10
- Discovery Questions Asked: ${coachingEvaluation.criteria.discoveryQuestions}
- Next Steps Established: ${coachingEvaluation.criteria.nextSteps ? 'Yes' : 'No'}

STRENGTHS:
${coachingEvaluation.strengths.map((s: string) => `• ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${coachingEvaluation.improvements.map((i: string) => `• ${i}`).join('\n')}

ACTION ITEMS FOR NEXT CALL:
${coachingEvaluation.actionItems.map((a: string) => `• ${a}`).join('\n')}

CALL SUMMARY:
${summary}

---
Generated by SoundScribe AI Coach
${recordingUrl ? `\nListen: ${recordingUrl}` : ''}
${pdfUrl ? `\nDownload PDF: ${pdfUrl}` : ''}
`;

  return { html, text };
}

function generateSummaryEmailContent({
  recordingTitle,
  summary,
  recordingUrl,
  pdfUrl
}: Omit<EmailData, 'to' | 'coachingEvaluation'>) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recording Summary</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">📝 Recording Summary</h1>
            <p style="color: #6b7280; margin: 8px 0 0; font-size: 16px;">${recordingTitle}</p>
        </div>

        <!-- Summary Content -->
        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
            <div style="color: #4b5563; white-space: pre-line; font-size: 16px; line-height: 1.7;">${summary}</div>
        </div>

        <!-- Action Buttons -->
        <div style="text-align: center; margin-top: 32px;">
            ${recordingUrl ? `<a href="${recordingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">🎧 Listen to Recording</a>` : ''}
            ${pdfUrl ? `<a href="${pdfUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">📄 Download PDF</a>` : ''}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">Generated by SoundScribe</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
RECORDING SUMMARY: ${recordingTitle}

${summary}

---
Generated by SoundScribe
${recordingUrl ? `\nListen: ${recordingUrl}` : ''}
${pdfUrl ? `\nDownload PDF: ${pdfUrl}` : ''}
`;

  return { html, text };
}