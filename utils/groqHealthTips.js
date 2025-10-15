const Groq = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

/**
 * Generate personalized health tips based on patient profile
 * @param {Object} patientProfile - Patient profile object
 * @param {Number} count - Number of tips to generate (default: 5)
 * @returns {Promise<Array>} Array of health tip objects
 */
async function generatePersonalizedHealthTips(patientProfile, count = 5) {
    try {
        // Calculate age from date of birth
        const age = patientProfile.dateOfBirth 
            ? new Date().getFullYear() - new Date(patientProfile.dateOfBirth).getFullYear()
            : null;

        // Calculate BMI if height and weight are available
        let bmi = null;
        if (patientProfile.healthProfile?.height?.value && patientProfile.healthProfile?.weight?.value) {
            const heightInMeters = patientProfile.healthProfile.height.value / 100;
            bmi = (patientProfile.healthProfile.weight.value / (heightInMeters * heightInMeters)).toFixed(1);
        }

        // Build patient context
        const patientContext = {
            age,
            gender: patientProfile.gender,
            bloodType: patientProfile.healthProfile?.bloodType,
            bmi,
            chronicConditions: patientProfile.healthProfile?.medicalHistory?.chronicConditions?.map(c => c.condition) || [],
            allergies: patientProfile.healthProfile?.allergies?.map(a => a.allergen) || [],
            currentMedications: patientProfile.healthProfile?.medications?.current?.map(m => m.name) || [],
            lifestyle: {
                smoking: patientProfile.healthProfile?.lifestyle?.smokingStatus,
                alcohol: patientProfile.healthProfile?.lifestyle?.alcoholConsumption,
                exercise: patientProfile.healthProfile?.lifestyle?.exerciseFrequency,
                diet: patientProfile.healthProfile?.lifestyle?.dietType
            },
            familyHistory: patientProfile.healthProfile?.familyHistory?.map(f => f.condition) || []
        };

        // Create prompt for Groq
        const prompt = `You are a medical health advisor. Generate ${count} personalized, evidence-based health tips for a patient with the following profile:

Age: ${patientContext.age || 'Unknown'}
Gender: ${patientContext.gender || 'Unknown'}
Blood Type: ${patientContext.bloodType || 'Unknown'}
BMI: ${patientContext.bmi || 'Unknown'}
Chronic Conditions: ${patientContext.chronicConditions.length > 0 ? patientContext.chronicConditions.join(', ') : 'None'}
Allergies: ${patientContext.allergies.length > 0 ? patientContext.allergies.join(', ') : 'None'}
Current Medications: ${patientContext.currentMedications.length > 0 ? patientContext.currentMedications.join(', ') : 'None'}
Smoking Status: ${patientContext.lifestyle.smoking || 'Unknown'}
Alcohol Consumption: ${patientContext.lifestyle.alcohol || 'Unknown'}
Exercise Frequency: ${patientContext.lifestyle.exercise || 'Unknown'}
Diet Type: ${patientContext.lifestyle.diet || 'Unknown'}
Family History: ${patientContext.familyHistory.length > 0 ? patientContext.familyHistory.join(', ') : 'None'}

For each health tip, provide:
1. A clear, engaging title (max 100 characters)
2. A brief summary (max 200 characters)
3. Detailed content with practical advice, formatted in HTML with proper headings (h3), paragraphs (p), and bullet lists (ul/li)
4. Appropriate category from: nutrition, exercise, mental-health, preventive-care, chronic-disease, heart-health, diabetes, weight-management, sleep, stress-management, women-health, men-health, child-health, senior-health, seasonal-health, general
5. 3-5 relevant tags
6. Priority level: low, medium, high, or critical
7. Difficulty level: easy, moderate, or challenging
8. Estimated reading time in minutes
9. Target audience (ageGroup: children/teens/adults/seniors/all, gender: male/female/all)
10. Credible source information (author, organization)

Format your response as a valid JSON array of objects with this structure:
[
  {
    "title": "string",
    "summary": "string",
    "content": "HTML string with h3, p, ul, li, strong tags",
    "category": "string",
    "tags": ["string"],
    "priority": "string",
    "difficulty": "string",
    "timeToRead": number,
    "targetAudience": {
      "ageGroup": "string",
      "gender": "string"
    },
    "source": {
      "author": "string",
      "organization": "string",
      "credibility": "verified|peer-reviewed|expert-opinion|general"
    }
  }
]

Make the tips specific to the patient's health profile, addressing their conditions, lifestyle, and risk factors. Ensure the content is actionable, evidence-based, and formatted with proper HTML structure.`;

        // Call Groq API
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a medical health advisor specializing in personalized health recommendations. Always provide evidence-based, practical health advice formatted in HTML. Your responses must be in valid JSON format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 8000,
            top_p: 0.9,
            response_format: { type: "json_object" }
        });

        // Parse the response
        const responseContent = completion.choices[0]?.message?.content;
        
        if (!responseContent) {
            throw new Error('No response from Groq API');
        }

        // Parse JSON response
        let healthTipsData;
        try {
            const parsed = JSON.parse(responseContent);
            // Handle both array and object with tips array
            healthTipsData = Array.isArray(parsed) ? parsed : (parsed.tips || parsed.healthTips || []);
        } catch (parseError) {
            console.error('Error parsing Groq response:', parseError);
            console.error('Response content:', responseContent);
            throw new Error('Failed to parse AI response');
        }

        // Validate and format health tips
        const healthTips = healthTipsData.map(tip => ({
            title: tip.title || 'Health Tip',
            summary: tip.summary || tip.title || 'Important health information',
            content: tip.content || '<p>No content available</p>',
            category: tip.category || 'general',
            tags: Array.isArray(tip.tags) ? tip.tags : [],
            priority: tip.priority || 'medium',
            difficulty: tip.difficulty || 'easy',
            timeToRead: tip.timeToRead || 3,
            targetAudience: {
                ageGroup: tip.targetAudience?.ageGroup || 'all',
                gender: tip.targetAudience?.gender || 'all',
                conditions: []
            },
            source: {
                author: tip.source?.author || 'AI Health Advisor',
                organization: tip.source?.organization || 'Bizil Health Care',
                credibility: tip.source?.credibility || 'expert-opinion'
            },
            status: 'published',
            featured: false,
            createdBy: 'system'
        }));

        return healthTips;

    } catch (error) {
        console.error('Error generating health tips with Groq:', error);
        throw error;
    }
}

/**
 * Generate a single health tip on a specific topic
 * @param {String} topic - The health topic
 * @param {Object} patientProfile - Patient profile object
 * @returns {Promise<Object>} Health tip object
 */
async function generateHealthTipOnTopic(topic, patientProfile = null) {
    try {
        const patientContext = patientProfile ? {
            age: patientProfile.dateOfBirth 
                ? new Date().getFullYear() - new Date(patientProfile.dateOfBirth).getFullYear()
                : null,
            gender: patientProfile.gender,
            conditions: patientProfile.healthProfile?.medicalHistory?.chronicConditions?.map(c => c.condition) || []
        } : null;

        const prompt = patientContext 
            ? `Generate a detailed, evidence-based health tip about "${topic}" personalized for a ${patientContext.age}-year-old ${patientContext.gender} patient${patientContext.conditions.length > 0 ? ' with ' + patientContext.conditions.join(', ') : ''}. Format the response as a JSON object with title, summary, content (in HTML with h3, p, ul, li tags), category, tags, priority, difficulty, timeToRead, targetAudience, and source fields.`
            : `Generate a detailed, evidence-based health tip about "${topic}". Format the response as a JSON object with title, summary, content (in HTML with h3, p, ul, li tags), category, tags, priority, difficulty, timeToRead, targetAudience, and source fields.`;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a medical health advisor. Provide evidence-based health advice in JSON format with HTML-formatted content."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0]?.message?.content;
        const tip = JSON.parse(responseContent);

        return {
            ...tip,
            status: 'published',
            featured: false,
            createdBy: 'system'
        };

    } catch (error) {
        console.error('Error generating health tip on topic:', error);
        throw error;
    }
}

module.exports = {
    generatePersonalizedHealthTips,
    generateHealthTipOnTopic
};
