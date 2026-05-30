// Token Authentication Service
// Handles validation of external tokens with expiration

class TokenAuth {
  constructor() {
    this.baseURL = 'https://couples.integrativepsychiatry.xyz';
    this.tokenCache = new Map(); // Cache token validation results
  }

  /**
   * Validate token with external API
   * @param {string} token - The secure token to validate
   * @param {string} module - The module slug for validation
   * @returns {Promise<Object>} Validation result
   */
  async validateToken(token, module = 'ifs-program') {
    try {
      console.log('🔍 Validating token for module:', module);
      
      // Check cache first (token valid for 15 minutes, cache for 10 minutes)
      const cacheKey = `${token}_${module}`;
      const cached = this.tokenCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 600000) { // 10 minutes
        console.log('✅ Using cached token validation');
        return cached.result;
      }

      const url = `${this.baseURL}/api/modules/validate-token?token=${encodeURIComponent(token)}&module=${encodeURIComponent(module)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Token validation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Cache the result
      this.tokenCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      console.log('✅ Token validation result:', result);
      return result;

    } catch (error) {
      console.error('❌ Token validation error:', error);
      return {
        success: false,
        error: error.message,
        valid: false
      };
    }
  }

  /**
   * Check if URL has token parameter
   * @param {string} url - Current URL
   * @returns {string|null} Token if present, null otherwise
   */
  extractTokenFromURL(url = window.location.search) {
    const params = new URLSearchParams(url);
    return params.get('token');
  }

  /**
   * Remove token from URL (for security)
   */
  cleanTokenFromURL() {
    if (window.location.pathname.startsWith('/sso/callback')) return;
    const url = new URL(window.location);
    url.searchParams.delete('token');
    const cleanURL = url.pathname + url.search + url.hash;
    window.history.replaceState({}, document.title, cleanURL);
  }

  /**
   * Parse token validation response and create client data
   * @param {Object} validation - Token validation response
   * @returns {Object} Client data for the app
   */
  createClientFromToken(validation) {
    if (!validation.valid || !validation.success) {
      return null;
    }

    // Create a client object from token validation
    return {
      id: validation.user_id || `token_${Date.now()}`,
      name: validation.name || validation.user_name || 'Token User',
      email: validation.email || 'token@example.com',
      phone: validation.phone || '',
      therapist_notes: `Logged in via token. Token validated: ${new Date().toISOString()}`,
      status: 'active',
      token_auth: true,
      token_expires_at: validation.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
      module: validation.module || 'ifs-program',
      ...validation.user_data
    };
  }

  /**
   * Check if token-based session has expired
   * @param {Object} client - Client object
   * @returns {boolean} True if expired
   */
  isTokenExpired(client) {
    if (!client || !client.token_auth || !client.token_expires_at) {
      return false; // Not token-based auth
    }

    return new Date(client.token_expires_at) < new Date();
  }

  /**
   * Clear expired tokens from cache
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.tokenCache.entries()) {
      if (now - value.timestamp > 600000) { // 10 minutes
        this.tokenCache.delete(key);
      }
    }
  }
}

export const tokenAuth = new TokenAuth();
export default tokenAuth;