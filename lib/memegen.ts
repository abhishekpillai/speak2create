export interface MemeTemplate {
  id: string;
  name: string;
  aliases: string[];
  blank: string;
  example: string;
  source: string;
}

export interface MemeGenerationRequest {
  template: string;
  topText?: string;
  bottomText?: string;
  customTexts?: string[];
}

export interface MemeGenerationResponse {
  imageUrl: string;
  templateUsed: string;
  templateName: string;
}

// Popular meme template aliases for natural language matching
const TEMPLATE_ALIASES: Record<string, string[]> = {
  'drake': [
    'drake meme', 'drake pointing', 'approval meme', 'drake format',
    'pointing drake', 'drake approve', 'drake reject'
  ],
  'adistractingboyfriend': [
    'distracted boyfriend', 'guy looking back', 'cheating boyfriend',
    'boyfriend looking at other girl', 'distracted guy'
  ],
  'woman_yelling_at_cat': [
    'woman yelling at cat', 'angry woman cat', 'cat at table',
    'woman pointing cat', 'yelling woman'
  ],
  'expanding_brain': [
    'expanding brain', 'brain expansion', 'galaxy brain', 
    'big brain', 'enlightened brain', 'growing brain'
  ],
  'two_buttons': [
    'two buttons', 'button choice', 'red button blue button',
    'difficult choice', 'button dilemma'
  ],
  'disaster_girl': [
    'disaster girl', 'girl smiling fire', 'evil girl',
    'girl in front of fire', 'smiling girl burning house'
  ],
  'hide_the_pain_harold': [
    'hide the pain harold', 'harold', 'stock photo harold',
    'painful smile', 'awkward smile harold'
  ],
  'success_kid': [
    'success kid', 'fist pump baby', 'victory baby',
    'successful baby', 'fist pump kid'
  ],
  'first_world_problems': [
    'first world problems', 'rich problems', 'privileged problems',
    'luxury problems'
  ],
  'one_does_not_simply': [
    'one does not simply', 'boromir', 'lotr meme',
    'lord of the rings', 'simply walk into mordor'
  ]
};

// Reverse mapping for quick lookups
const ALIAS_TO_TEMPLATE: Record<string, string> = {};
Object.entries(TEMPLATE_ALIASES).forEach(([templateId, aliases]) => {
  aliases.forEach(alias => {
    ALIAS_TO_TEMPLATE[alias.toLowerCase()] = templateId;
  });
});

export class MemegenClient {
  private baseUrl = 'https://api.memegen.link';
  private templates: MemeTemplate[] = [];
  private lastFetch = 0;
  private cacheDuration = 60 * 60 * 1000; // 1 hour

  async getTemplates(): Promise<MemeTemplate[]> {
    const now = Date.now();
    
    // Use cached templates if available and fresh
    if (this.templates.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return this.templates;
    }

    try {
      const response = await fetch(`${this.baseUrl}/templates/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      
      const templates = await response.json();
      this.templates = templates.map((template: any) => ({
        id: template.id,
        name: template.name || template.id,
        aliases: TEMPLATE_ALIASES[template.id] || [template.id],
        blank: template.blank,
        example: template.example,
        source: template.source
      }));
      
      this.lastFetch = now;
      return this.templates;
    } catch (error) {
      console.error('Failed to fetch meme templates:', error);
      // Return empty array or cached templates if fetch fails
      return this.templates;
    }
  }

  async searchTemplate(query: string): Promise<MemeTemplate | null> {
    const templates = await this.getTemplates();
    const normalizedQuery = query.toLowerCase().trim();

    // First try exact alias match
    const templateId = ALIAS_TO_TEMPLATE[normalizedQuery];
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) return template;
    }

    // Then try partial matches in aliases
    for (const template of templates) {
      for (const alias of template.aliases) {
        if (alias.toLowerCase().includes(normalizedQuery) || 
            normalizedQuery.includes(alias.toLowerCase())) {
          return template;
        }
      }
    }

    // Finally try template name/ID matches
    const nameMatch = templates.find(t => 
      t.name.toLowerCase().includes(normalizedQuery) ||
      t.id.toLowerCase().includes(normalizedQuery) ||
      normalizedQuery.includes(t.name.toLowerCase())
    );

    return nameMatch || null;
  }

  async generateMeme(request: MemeGenerationRequest): Promise<MemeGenerationResponse> {
    // Find the template
    const template = await this.searchTemplate(request.template);
    if (!template) {
      throw new Error(`Template not found: ${request.template}`);
    }

    // Build meme URL based on template and text
    let memeUrl = `${this.baseUrl}/images/${template.id}`;
    
    // Handle different text configurations
    if (request.customTexts && request.customTexts.length > 0) {
      // Use custom text array (for multi-panel memes)
      const encodedTexts = request.customTexts.map(text => 
        this.encodeText(text || '_')
      );
      memeUrl += `/${encodedTexts.join('/')}`;
    } else {
      // Use top/bottom text format
      const topText = this.encodeText(request.topText || '_');
      const bottomText = this.encodeText(request.bottomText || '_');
      memeUrl += `/${topText}/${bottomText}`;
    }

    memeUrl += '.jpg';


    try {
      // Fetch the meme image
      const imageResponse = await fetch(memeUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to generate meme: ${imageResponse.statusText}`);
      }

      // Convert to base64 data URL for consistency with existing system
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      return {
        imageUrl: dataUrl,
        templateUsed: template.id,
        templateName: template.name
      };
    } catch (error) {
      console.error('Failed to generate meme:', error);
      throw error;
    }
  }

  private encodeText(text: string): string {
    // memegen.link uses specific encoding for text
    return text
      .replace(/\s+/g, '_')  // Spaces to underscores
      .replace(/[?]/g, '~q')  // Question marks
      .replace(/[%]/g, '~p')  // Percent signs
      .replace(/[#]/g, '~h')  // Hash symbols
      .replace(/[\/]/g, '~s') // Forward slashes
      .replace(/["]/g, "''")  // Double quotes to two single quotes
      || '_'; // Default to underscore if empty
  }

  // Helper method to get popular templates for suggestions
  getPopularTemplates(): string[] {
    return [
      'drake', 'adistractingboyfriend', 'woman_yelling_at_cat',
      'expanding_brain', 'two_buttons', 'disaster_girl',
      'hide_the_pain_harold', 'success_kid', 'first_world_problems',
      'one_does_not_simply'
    ];
  }

  // Get human-readable name for a template
  getTemplateName(templateId: string): string {
    const aliases = TEMPLATE_ALIASES[templateId];
    return aliases ? aliases[0] : templateId;
  }
}

// Export singleton instance
export const memegenClient = new MemegenClient();