const { generateAIResponse, getModel } = require('./geminiService');
const { saveAutopostHistory, loadAutopostHistory, clearAutopostHistory } = require('../utils/persistentStorage');
const { createPost, isConfigured } = require('./threadsService');
const { autoReplySettings } = require('../config/settings');

class AutopostService {
  constructor() {
    this.history = [];
    this.settings = {
      aiProvider: 'gemini',
      systemPrompt: `You are an expert social media content creator specializing in Threads posts. 
Your goal is to create engaging, authentic, and shareable content that resonates with the target audience.

GUIDELINES:
- Write in a natural, conversational tone
- Include relevant hashtags when requested
- Keep content authentic and relatable
- Match the requested style and tone
- Consider the target audience in your language and approach
- Make content shareable and discussion-worthy
- Use Indonesian language unless specified otherwise

CONTENT STRUCTURE:
- Start with a hook to grab attention
- Provide value or entertainment
- End with engagement (question, call-to-action, or thought-provoker)
- Use line breaks for readability
- Keep within Threads character limits

Remember: Create content that feels human, not robotic. The goal is authentic engagement.`,
      autoSaveDrafts: true,
      defaultHashtags: true,
      defaultEmojis: true
    };
    this.initializeHistory();
  }

  async initializeHistory() {
    try {
      this.history = await loadAutopostHistory() || [];
      console.log(`📝 Loaded ${this.history.length} autopost history items`);
    } catch (error) {
      console.error('Error loading autopost history:', error);
      this.history = [];
    }
  }

  async generatePost(postData, userId = null) {
    try {
      const model = getModel();
      if (!model) {
        throw new Error('AI model not initialized. Please check your Gemini API key.');
      }

      // Build the prompt based on user input and settings
      const prompt = this.buildPrompt(postData);
      
      console.log('🤖 Generating post with Gemini AI...');
      console.log('📝 Prompt:', prompt.substring(0, 200) + '...');

      // Generate content using Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let generatedContent = response.text();

      // Clean up the generated content
      generatedContent = this.cleanUpContent(generatedContent);

      // Create history entry
      const historyEntry = {
        id: this.generateId(),
        content: generatedContent,
        metadata: postData,
        timestamp: new Date().toISOString(),
        status: 'draft',
        userId: userId
      };

      // Add to history
      this.history.unshift(historyEntry);
      await this.saveHistory();

      console.log('✅ Post generated successfully');
      
      return {
        content: generatedContent,
        id: historyEntry.id,
        metadata: postData,
        stats: {
          characters: generatedContent.length,
          words: generatedContent.split(/\s+/).filter(word => word.length > 0).length,
          hashtags: (generatedContent.match(/#\w+/g) || []).length,
          emojis: (generatedContent.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length
        }
      };
    } catch (error) {
      console.error('❌ Error generating post:', error);
      throw new Error(`Failed to generate post: ${error.message}`);
    }
  }

  buildPrompt(postData) {
    let prompt = this.settings.systemPrompt + '\n\n';

    // Add post requirements
    prompt += `POST REQUIREMENTS:\n`;
    prompt += `- Idea/Topic: ${postData.idea}\n`;
    prompt += `- Style: ${postData.style}\n`;
    prompt += `- Length: ${postData.length}\n`;
    
    if (postData.targetAudience) {
      prompt += `- Target Audience: ${postData.targetAudience}\n`;
    }

    // Add options
    prompt += `\nOPTIONS:\n`;
    prompt += `- Include Hashtags: ${postData.includeHashtags ? 'Yes' : 'No'}\n`;
    prompt += `- Include Emojis: ${postData.includeEmojis ? 'Yes' : 'No'}\n`;
    prompt += `- Include Call-to-Action: ${postData.includeCTA ? 'Yes' : 'No'}\n`;

    // Add length guidance
    const lengthGuide = {
      'short': '1-2 paragraphs, concise and punchy',
      'medium': '3-4 paragraphs, detailed but engaging',
      'long': '5+ paragraphs, comprehensive and in-depth'
    };
    
    prompt += `\nLENGTH GUIDANCE: ${lengthGuide[postData.length] || lengthGuide['medium']}\n`;

    // Add style guidance
    const styleGuide = {
      'casual': 'Friendly, conversational, relatable tone with casual language',
      'professional': 'Polished, authoritative, industry-focused language',
      'funny': 'Humorous, witty, entertaining with jokes or clever observations',
      'inspirational': 'Motivational, uplifting, encouraging tone',
      'educational': 'Informative, clear, teaching-focused content',
      'storytelling': 'Narrative-driven, personal anecdotes, story structure'
    };

    prompt += `\nSTYLE GUIDANCE: ${styleGuide[postData.style] || styleGuide['casual']}\n`;

    prompt += `\nPlease create an engaging Threads post based on these requirements. Make it authentic and shareable.`;

    return prompt;
  }

  cleanUpContent(content) {
    // Remove any AI-like responses or metadata
    content = content
      .replace(/^(AI|Bot|Assistant)[\s:]/gi, '')
      .replace(/sebagai ai|sebagai bot|sebagai asisten/gi, '')
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^#+\s/gm, '') // Remove markdown headers
      .trim();

    // Ensure proper line breaks for readability
    content = content.replace(/\n{3,}/g, '\n\n');

    return content;
  }

  async saveDraft(content, metadata = {}, userId = null) {
    try {
      const draftEntry = {
        id: this.generateId(),
        content: content,
        metadata: metadata,
        timestamp: new Date().toISOString(),
        status: 'draft',
        userId: userId
      };

      this.history.unshift(draftEntry);
      await this.saveHistory();

      console.log('📝 Draft saved successfully');
      return draftEntry;
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      throw new Error(`Failed to save draft: ${error.message}`);
    }
  }

  async publishPost(content, userId = null) {
    try {
      // Here you would integrate with Threads API to actually post
      console.log('📤 Publishing post to Threads...');
      
      // Check if threadsService is available and configured
      let postResult = null;
      if (isConfigured() && autoReplySettings.accessToken) {
        try {
          // Attempt to post to Threads
          postResult = await createPost(content, autoReplySettings.accessToken);
          console.log('✅ Post published to Threads successfully');
        } catch (error) {
          console.warn('⚠️ Threads posting failed, saving as published locally:', error.message);
          // Continue to save as published even if Threads API fails
        }
      } else {
        console.log('📝 Threads API not configured, saving as published locally');
      }

      const publishedEntry = {
        id: this.generateId(),
        content: content,
        timestamp: new Date().toISOString(),
        status: 'posted',
        userId: userId,
        threadsPostId: postResult ? postResult.id : null,
        threadsUrl: postResult ? postResult.url : null
      };

      this.history.unshift(publishedEntry);
      await this.saveHistory();

      console.log('✅ Post marked as published in history');
      return publishedEntry;
    } catch (error) {
      console.error('❌ Error publishing post:', error);
      throw new Error(`Failed to publish post: ${error.message}`);
    }
  }

  async getHistory(userId = null, limit = 50) {
    try {
      let history = this.history;
      
      // Filter by user if userId provided
      if (userId) {
        history = history.filter(item => item.userId === userId);
      }

      // Limit results
      history = history.slice(0, limit);

      // Sort by timestamp (newest first)
      history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return history;
    } catch (error) {
      console.error('❌ Error getting history:', error);
      throw new Error(`Failed to get history: ${error.message}`);
    }
  }

  async deleteHistoryItem(id, userId = null) {
    try {
      const index = this.history.findIndex(item => 
        item.id === id && (userId ? item.userId === userId : true)
      );

      if (index === -1) {
        throw new Error('History item not found');
      }

      this.history.splice(index, 1);
      await this.saveHistory();

      console.log('🗑️ History item deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting history item:', error);
      throw new Error(`Failed to delete history item: ${error.message}`);
    }
  }

  async clearHistory(userId = null) {
    try {
      if (userId) {
        // Clear only user's history
        this.history = this.history.filter(item => item.userId !== userId);
      } else {
        // Clear all history
        this.history = [];
      }

      await this.saveHistory();
      console.log('🗑️ History cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Error clearing history:', error);
      throw new Error(`Failed to clear history: ${error.message}`);
    }
  }

  async getSettings() {
    return { ...this.settings };
  }

  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      console.log('⚙️ Autopost settings updated successfully');
      return this.settings;
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      throw new Error(`Failed to update settings: ${error.message}`);
    }
  }

  async resetSettings() {
    try {
      this.settings = {
        aiProvider: 'gemini',
        systemPrompt: `You are an expert social media content creator specializing in Threads posts. 
Your goal is to create engaging, authentic, and shareable content that resonates with the target audience.

GUIDELINES:
- Write in a natural, conversational tone
- Use emojis strategically to enhance engagement
- Include relevant hashtags when requested
- Keep content authentic and relatable
- Match the requested style and tone
- Consider the target audience in your language and approach
- Make content shareable and discussion-worthy
- Use Indonesian language unless specified otherwise

CONTENT STRUCTURE:
- Start with a hook to grab attention
- Provide value or entertainment
- End with engagement (question, call-to-action, or thought-provoker)
- Use line breaks for readability
- Keep within Threads character limits

Remember: Create content that feels human, not robotic. The goal is authentic engagement.`,
        autoSaveDrafts: true,
        defaultHashtags: true,
        defaultEmojis: true
      };
      
      console.log('🔄 Autopost settings reset to defaults');
      return this.settings;
    } catch (error) {
      console.error('❌ Error resetting settings:', error);
      throw new Error(`Failed to reset settings: ${error.message}`);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async saveHistory() {
    try {
      await saveAutopostHistory(this.history);
    } catch (error) {
      console.error('Error saving autopost history:', error);
      // Don't throw here to avoid breaking the main flow
    }
  }

  // Get statistics
  getStats(userId = null) {
    let history = this.history;
    
    if (userId) {
      history = history.filter(item => item.userId === userId);
    }

    const totalPosts = history.length;
    const drafts = history.filter(item => item.status === 'draft').length;
    const published = history.filter(item => item.status === 'posted').length;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const monthlyPosts = history.filter(item => 
      new Date(item.timestamp) >= thisMonth
    ).length;

    return {
      totalPosts,
      drafts,
      published,
      monthlyPosts,
      lastPost: history.length > 0 ? history[0].timestamp : null
    };
  }
}

// Create singleton instance
const autopostService = new AutopostService();

module.exports = {
  autopostService,
  AutopostService
};
