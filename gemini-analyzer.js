// Gemini AI Content Analyzer for Policy Violations
class GeminiContentAnalyzer {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.model = 'gemini-1.5-flash';
        this.policies = {
            general: this.getGeneralTSPolicies(),
            custom: []
        };
        
        this.init();
    }

    async init() {
        await this.loadConfiguration();
        await this.loadCustomPolicies();
    }

    getGeneralTSPolicies() {
        return {
            hate_speech: {
                name: "Hate Speech",
                description: "Content that attacks, threatens, or incites violence against people based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics",
                severity: "high",
                examples: [
                    "Racial slurs and epithets",
                    "Religious discrimination",
                    "Gender-based harassment",
                    "Homophobic or transphobic content",
                    "Ableist language and discrimination"
                ]
            },
            harassment: {
                name: "Harassment & Bullying",
                description: "Content intended to intimidate, threaten, or harm individuals through repeated unwanted contact or behavior",
                severity: "high",
                examples: [
                    "Personal attacks and insults",
                    "Doxxing or sharing private information",
                    "Cyberbullying and trolling",
                    "Stalking behavior",
                    "Threats of violence"
                ]
            },
            violence: {
                name: "Violence & Threats",
                description: "Content that promotes, glorifies, or threatens violence against individuals or groups",
                severity: "high",
                examples: [
                    "Graphic violence and gore",
                    "Threats of physical harm",
                    "Instructions for violence",
                    "Terrorist content",
                    "Self-harm promotion"
                ]
            },
            adult_content: {
                name: "Adult Content",
                description: "Sexually explicit content, nudity, or adult material not appropriate for general audiences",
                severity: "medium",
                examples: [
                    "Pornographic material",
                    "Sexual content involving minors",
                    "Non-consensual sexual content",
                    "Sexual solicitation",
                    "Explicit nudity"
                ]
            },
            spam: {
                name: "Spam & Scams",
                description: "Repetitive, unwanted, or deceptive content designed to manipulate or defraud users",
                severity: "medium",
                examples: [
                    "Phishing attempts",
                    "Fake news and misinformation",
                    "Pyramid schemes",
                    "Unsolicited promotional content",
                    "Clickbait and misleading headlines"
                ]
            },
            intellectual_property: {
                name: "Intellectual Property",
                description: "Content that infringes on copyrights, trademarks, or other intellectual property rights",
                severity: "medium",
                examples: [
                    "Copyrighted material without permission",
                    "Trademark violations",
                    "Pirated software or media",
                    "Plagiarized content",
                    "Counterfeit goods"
                ]
            },
            dangerous_activities: {
                name: "Dangerous Activities",
                description: "Content that promotes or provides instructions for dangerous, illegal, or harmful activities",
                severity: "high",
                examples: [
                    "Drug manufacturing instructions",
                    "Weapon creation guides",
                    "Dangerous challenges or dares",
                    "Illegal activity promotion",
                    "Self-harm instructions"
                ]
            },
            privacy_violations: {
                name: "Privacy Violations",
                description: "Content that violates privacy rights or shares personal information without consent",
                severity: "medium",
                examples: [
                    "Non-consensual sharing of private information",
                    "Revenge porn",
                    "Doxxing",
                    "Stalking behavior",
                    "Unauthorized surveillance"
                ]
            }
        };
    }

    async loadConfiguration() {
        try {
            const result = await chrome.storage.sync.get(['geminiApiKey']);
            this.apiKey = result.geminiApiKey;
        } catch (error) {
            console.error('Error loading Gemini configuration:', error);
        }
    }

    async loadCustomPolicies() {
        try {
            const result = await chrome.storage.sync.get(['customPolicies']);
            this.policies.custom = result.customPolicies || [];
        } catch (error) {
            console.error('Error loading custom policies:', error);
        }
    }

    async saveConfiguration() {
        try {
            await chrome.storage.sync.set({ 
                geminiApiKey: this.apiKey,
                customPolicies: this.policies.custom
            });
        } catch (error) {
            console.error('Error saving configuration:', error);
        }
    }

    async analyzeContent(content, url, context = {}) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const analysisPrompt = this.buildAnalysisPrompt(content, url, context);
            const response = await this.callGeminiAPI(analysisPrompt);
            return this.parseAnalysisResponse(response);
        } catch (error) {
            console.error('Error analyzing content with Gemini:', error);
            throw error;
        }
    }

    buildAnalysisPrompt(content, url, context) {
        const policies = this.getAllPolicies();
        const policyDescriptions = Object.entries(policies).map(([key, policy]) => 
            `- ${policy.name}: ${policy.description} (Severity: ${policy.severity})`
        ).join('\n');

        return `You are a content moderation AI assistant. Analyze the following content for policy violations.

POLICIES TO CHECK:
${policyDescriptions}

CONTENT TO ANALYZE:
URL: ${url}
Content: ${content.substring(0, 4000)} ${content.length > 4000 ? '...[truncated]' : ''}

CONTEXT:
- Page Title: ${context.title || 'Unknown'}
- Domain: ${context.domain || 'Unknown'}
- Content Type: ${context.type || 'Text'}
- User Agent: ${context.userAgent || 'Unknown'}

ANALYSIS REQUIREMENTS:
1. Identify any policy violations in the content
2. For each violation, provide:
   - Policy category
   - Severity level (low/medium/high)
   - Confidence score (0-100)
   - Specific text that violates the policy
   - Explanation of why it violates the policy
3. If no violations are found, respond with "NO_VIOLATIONS"
4. Consider context, intent, and nuance in your analysis
5. Be conservative but fair in your assessments

RESPONSE FORMAT (JSON):
{
  "violations": [
    {
      "policy": "policy_name",
      "severity": "low|medium|high",
      "confidence": 85,
      "violating_text": "specific text that violates policy",
      "explanation": "why this violates the policy",
      "start_index": 0,
      "end_index": 50
    }
  ],
  "overall_toxicity_score": 0.75,
  "summary": "Brief summary of findings"
}

Respond only with valid JSON.`;
    }

    async callGeminiAPI(prompt) {
        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 0.8,
                maxOutputTokens: 2048
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || '';
    }

    parseAnalysisResponse(response) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);
            
            // Validate and enhance the analysis
            return {
                violations: analysis.violations || [],
                overall_toxicity_score: analysis.overall_toxicity_score || 0,
                summary: analysis.summary || 'No violations detected',
                timestamp: new Date().toISOString(),
                model_used: this.model
            };
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            return {
                violations: [],
                overall_toxicity_score: 0,
                summary: 'Error parsing analysis response',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async analyzeURL(url) {
        try {
            // Get the current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Extract content from the page
            const pageContent = await this.extractPageContent(tab.id);
            
            // Get URL context
            const urlContext = await this.getURLContext(url, tab);
            
            // Analyze with Gemini
            const analysis = await this.analyzeContent(pageContent.text, url, urlContext);
            
            return {
                url: url,
                analysis: analysis,
                pageContent: pageContent,
                context: urlContext,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error analyzing URL:', error);
            throw error;
        }
    }

    async extractPageContent(tabId) {
        try {
            // Check if scripting API is available
            if (!chrome.scripting || !chrome.scripting.executeScript) {
                console.warn('Chrome scripting API not available for content extraction');
                return null;
            }
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Extract main content, avoiding navigation, ads, etc.
                    const contentSelectors = [
                        'main', 'article', '.content', '.post', '.comment',
                        '.message', '.text', 'p', 'div[role="main"]'
                    ];
                    
                    let content = '';
                    let title = document.title;
                    
                    // Try to find main content
                    for (const selector of contentSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            const text = element.textContent?.trim();
                            if (text && text.length > 50) {
                                content += text + '\n';
                            }
                        }
                    }
                    
                    // Fallback to body content
                    if (!content) {
                        content = document.body.textContent || '';
                    }
                    
                    // Clean up the content
                    content = content
                        .replace(/\s+/g, ' ')
                        .replace(/\n\s*\n/g, '\n')
                        .trim();
                    
                    return {
                        text: content,
                        title: title,
                        url: window.location.href,
                        wordCount: content.split(/\s+/).length,
                        charCount: content.length
                    };
                }
            });
            
            return results[0]?.result || { text: '', title: '', url: '', wordCount: 0, charCount: 0 };
        } catch (error) {
            console.error('Error extracting page content:', error);
            return { text: '', title: '', url: '', wordCount: 0, charCount: 0 };
        }
    }

    async getURLContext(url, tab) {
        try {
            const urlObj = new URL(url);
            return {
                domain: urlObj.hostname,
                path: urlObj.pathname,
                protocol: urlObj.protocol,
                title: tab.title,
                type: this.detectContentType(url, tab.title),
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting URL context:', error);
            return {
                domain: 'unknown',
                path: '/',
                protocol: 'https:',
                title: 'Unknown',
                type: 'unknown',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
        }
    }

    detectContentType(url, title) {
        const urlLower = url.toLowerCase();
        const titleLower = title.toLowerCase();
        
        if (urlLower.includes('social') || urlLower.includes('twitter') || urlLower.includes('facebook')) {
            return 'social_media';
        } else if (urlLower.includes('news') || titleLower.includes('news')) {
            return 'news';
        } else if (urlLower.includes('forum') || urlLower.includes('reddit')) {
            return 'forum';
        } else if (urlLower.includes('blog')) {
            return 'blog';
        } else if (urlLower.includes('comment') || urlLower.includes('review')) {
            return 'user_generated';
        } else {
            return 'general';
        }
    }

    getAllPolicies() {
        const allPolicies = { ...this.policies.general };
        
        // Add custom policies
        this.policies.custom.forEach((policy, index) => {
            allPolicies[`custom_${index}`] = policy;
        });
        
        return allPolicies;
    }

    async addCustomPolicy(policy) {
        const newPolicy = {
            id: `custom_${Date.now()}`,
            name: policy.name,
            description: policy.description,
            severity: policy.severity,
            examples: policy.examples || [],
            created: new Date().toISOString(),
            enabled: true
        };
        
        this.policies.custom.push(newPolicy);
        await this.saveConfiguration();
        return newPolicy;
    }

    async updateCustomPolicy(policyId, updates) {
        const index = this.policies.custom.findIndex(p => p.id === policyId);
        if (index !== -1) {
            this.policies.custom[index] = { ...this.policies.custom[index], ...updates };
            await this.saveConfiguration();
            return this.policies.custom[index];
        }
        throw new Error('Policy not found');
    }

    async deleteCustomPolicy(policyId) {
        this.policies.custom = this.policies.custom.filter(p => p.id !== policyId);
        await this.saveConfiguration();
    }

    async setApiKey(apiKey) {
        this.apiKey = apiKey;
        await this.saveConfiguration();
    }

    isConfigured() {
        return !!this.apiKey;
    }

    getPolicyStats() {
        return {
            general: Object.keys(this.policies.general).length,
            custom: this.policies.custom.length,
            total: Object.keys(this.policies.general).length + this.policies.custom.length
        };
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiContentAnalyzer;
} else {
    window.GeminiContentAnalyzer = GeminiContentAnalyzer;
}
