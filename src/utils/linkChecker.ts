import axios from 'axios';
import logger from './logger.js';

export interface LinkCheckResult {
  url: string;
  accessible: boolean;
  status?: number;
  error?: string;
  responseTime?: number;
}

export class LinkChecker {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  static async checkUrl(url: string, sessionId?: string): Promise<LinkCheckResult> {
    const startTime = Date.now();

    const headers: any = {
      'User-Agent': this.USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
    };

    // Add authentication if session ID is provided
    if (sessionId) {
      headers['Cookie'] = `LEETCODE_SESSION=${sessionId}`;
    }

    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        headers,
        validateStatus: (status) => status < 500, // Accept all status codes below 500
      });

      const responseTime = Date.now() - startTime;
      const accessible = response.status >= 200 && response.status < 400;

      return {
        url,
        accessible,
        status: response.status,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      if (error.response) {
        // Server responded with error status
        return {
          url,
          accessible: false,
          status: error.response.status,
          error: `HTTP ${error.response.status}: ${error.response.statusText}`,
          responseTime,
        };
      } else if (error.code === 'ECONNABORTED') {
        // Timeout
        return {
          url,
          accessible: false,
          error: 'Request timeout',
          responseTime,
        };
      } else if (error.code === 'ENOTFOUND') {
        // DNS resolution failed
        return {
          url,
          accessible: false,
          error: 'Domain not found',
          responseTime,
        };
      } else {
        // Other network errors
        return {
          url,
          accessible: false,
          error: error.message,
          responseTime,
        };
      }
    }
  }

  static async checkMultipleUrls(urls: string[], sessionId?: string): Promise<LinkCheckResult[]> {
    logger.info(`Checking accessibility of ${urls.length} URLs`, {
      authenticated: !!sessionId
    });

    const results = await Promise.allSettled(
      urls.map(url => this.checkUrl(url, sessionId))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urls[index],
          accessible: false,
          error: `Promise rejected: ${result.reason}`,
        };
      }
    });
  }

  static printResults(results: LinkCheckResult[]): void {
    const accessible = results.filter(r => r.accessible);
    const inaccessible = results.filter(r => !r.accessible);

    console.log('\n📊 Link Accessibility Report');
    console.log('='.repeat(50));
    console.log(`✅ Accessible: ${accessible.length}`);
    console.log(`❌ Inaccessible: ${inaccessible.length}`);
    console.log(`📈 Total: ${results.length}`);
    console.log(`✨ Success Rate: ${((accessible.length / results.length) * 100).toFixed(2)}%`);

    if (inaccessible.length > 0) {
      console.log('\n❌ Inaccessible URLs:');
      console.log('-'.repeat(50));
      inaccessible.forEach((result) => {
        console.log(`🔗 ${result.url}`);
        console.log(`   Status: ${result.status || 'N/A'}`);
        console.log(`   Error: ${result.error || 'Unknown error'}`);
        console.log(`   Response Time: ${result.responseTime || 0}ms`);
        console.log('');
      });
    }

    if (accessible.length > 0) {
      console.log('\n✅ Accessible URLs:');
      console.log('-'.repeat(50));
      accessible.forEach((result) => {
        console.log(`🔗 ${result.url}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response Time: ${result.responseTime}ms`);
        console.log('');
      });
    }
  }
}

// LeetCode-specific URL patterns
export const LEETCODE_URLS = {
  MAIN_SITE: 'https://leetcode.com',
  GRAPHQL_API: 'https://leetcode.com/graphql',
  FAVORITES_API: 'https://leetcode.com/problems/api/favorites/',
  LOGIN_PAGE: 'https://leetcode.com/accounts/login/',
  PROBLEMS_PAGE: 'https://leetcode.com/problems/',
  // Sample problem URLs to test
  SAMPLE_PROBLEMS: [
    'https://leetcode.com/problems/two-sum/',
    'https://leetcode.com/problems/add-two-numbers/',
    'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    'https://leetcode.com/problems/median-of-two-sorted-arrays/',
    'https://leetcode.com/problems/longest-palindromic-substring/',
  ]
};

export default LinkChecker;