/**
 * Tests for Page Monitor to n8n Chrome Extension
 * Tests content extraction functionality from page-monitor-content.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Mock chrome runtime
global.chrome = {
  runtime: {
    onMessage: {
      addListener: () => {}
    },
    sendMessage: () => {},
    lastError: null
  },
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve()
    }
  }
};

/**
 * Loads and prepares the page monitor content script
 * @returns {string} - The processed content script code
 */
function loadContentScript() {
  const contentScriptPath = path.join(__dirname, '..', 'src', 'content-scripts', 'page-monitor-content.js');
  const contentScriptCode = fs.readFileSync(contentScriptPath, 'utf8');

  // Remove the chrome.runtime.onMessage.addListener part at the end
  const messageListenerStart = contentScriptCode.indexOf('/**\n * Message listener for background script communication');
  
  if (messageListenerStart !== -1) {
    // Keep everything before the message listener
    const functionsOnly = contentScriptCode.substring(0, messageListenerStart).trim();
    return functionsOnly;
  } else {
    // Fallback: remove everything after chrome.runtime.onMessage.addListener
    const functionsOnly = contentScriptCode
      .replace(/console\.log\('Page Monitor:.*?\);/, '') // Remove initial console.log
      .replace(/chrome\.runtime\.onMessage\.addListener[\s\S]*$/, ''); // Remove event listener
    return functionsOnly;
  }
}

/**
 * Creates a JSDOM instance with the provided HTML
 * @param {string} htmlContent - HTML content to create DOM from
 * @param {string} url - Base URL for the document
 * @returns {Object} - JSDOM instance and window/document
 */
function createDOM(htmlContent, url = 'https://example.com/test') {
  const dom = new JSDOM(htmlContent, {
    url: url,
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'outside-only'
  });

  const document = dom.window.document;
  const window = dom.window;

  // Set up globals
  global.document = document;
  global.window = window;

  // Add innerText polyfill for JSDOM
  Object.defineProperty(window.Element.prototype, 'innerText', {
    get() {
      return this.textContent;
    },
    set(value) {
      this.textContent = value;
    }
  });

  return { dom, window, document };
}

/**
 * Test extractBlockContent function
 */
function testExtractBlockContent() {
  console.log('\n🧪 Testing extractBlockContent function...\n');

  // Load the content script
  const functionsOnly = loadContentScript();
  
  // Test Case 1: Extract HTML content from ID selector
  console.log('Test 1: Extract HTML content from #content selector');
  const html1 = `
    <html>
      <body>
        <div id="content">
          <h1>Test Title</h1>
          <p>Test paragraph</p>
        </div>
      </body>
    </html>
  `;
  const { dom: dom1 } = createDOM(html1);
  eval(functionsOnly);
  
  const result1 = extractBlockContent('#content', 'html');
  if (result1.success && result1.content.includes('Test Title')) {
    console.log('✅ Test 1: PASSED');
  } else {
    console.log('❌ Test 1: FAILED');
    console.log('Result:', result1);
    dom1.window.close();
    return false;
  }
  dom1.window.close();

  // Test Case 2: Extract text content
  console.log('Test 2: Extract text content from .article selector');
  const html2 = `
    <html>
      <body>
        <article class="article">
          <h2>Article Title</h2>
          <p>Article content here</p>
        </article>
      </body>
    </html>
  `;
  const { dom: dom2 } = createDOM(html2);
  eval(functionsOnly);
  
  const result2 = extractBlockContent('.article', 'text');
  if (result2.success && result2.content.includes('Article Title') && !result2.content.includes('<')) {
    console.log('✅ Test 2: PASSED');
  } else {
    console.log('❌ Test 2: FAILED');
    console.log('Result:', result2);
    dom2.window.close();
    return false;
  }
  dom2.window.close();

  // Test Case 3: Invalid selector
  console.log('Test 3: Invalid selector should return error');
  const html3 = `<html><body><div>Content</div></body></html>`;
  const { dom: dom3 } = createDOM(html3);
  eval(functionsOnly);
  
  const result3 = extractBlockContent('#nonexistent', 'html');
  if (!result3.success && result3.error) {
    console.log('✅ Test 3: PASSED');
  } else {
    console.log('❌ Test 3: FAILED');
    console.log('Result:', result3);
    dom3.window.close();
    return false;
  }
  dom3.window.close();

  // Test Case 4: Empty selector
  console.log('Test 4: Empty selector should return error');
  const html4 = `<html><body><div>Content</div></body></html>`;
  const { dom: dom4 } = createDOM(html4);
  eval(functionsOnly);
  
  const result4 = extractBlockContent('', 'html');
  if (!result4.success && result4.error === 'No selector provided') {
    console.log('✅ Test 4: PASSED');
  } else {
    console.log('❌ Test 4: FAILED');
    console.log('Result:', result4);
    dom4.window.close();
    return false;
  }
  dom4.window.close();

  // Test Case 5: Complex selector
  console.log('Test 5: Complex CSS selector');
  const html5 = `
    <html>
      <body>
        <div class="container">
          <main class="main-content">
            <section id="article-section">
              <h1>Complex Selector Test</h1>
              <p>This is a test</p>
            </section>
          </main>
        </div>
      </body>
    </html>
  `;
  const { dom: dom5 } = createDOM(html5);
  eval(functionsOnly);
  
  const result5 = extractBlockContent('main.main-content section#article-section', 'html');
  if (result5.success && result5.content.includes('Complex Selector Test')) {
    console.log('✅ Test 5: PASSED');
  } else {
    console.log('❌ Test 5: FAILED');
    console.log('Result:', result5);
    dom5.window.close();
    return false;
  }
  dom5.window.close();

  // Test Case 6: Check return structure
  console.log('Test 6: Return structure validation');
  const html6 = `<html><body><div id="test">Content</div></body></html>`;
  const { dom: dom6 } = createDOM(html6);
  eval(functionsOnly);
  
  const result6 = extractBlockContent('#test', 'html');
  const hasRequiredFields = result6.success && 
                           result6.content !== undefined &&
                           result6.selector === '#test' &&
                           result6.url !== undefined &&
                           result6.timestamp !== undefined;
  
  if (hasRequiredFields) {
    console.log('✅ Test 6: PASSED');
  } else {
    console.log('❌ Test 6: FAILED');
    console.log('Result:', result6);
    dom6.window.close();
    return false;
  }
  dom6.window.close();

  return true;
}

/**
 * Main test runner
 */
function runAllTests() {
  console.log('🚀 Running Page Monitor to n8n tests...\n');
  
  const results = [];
  
  // Run extractBlockContent tests
  const extractTestsPassed = testExtractBlockContent();
  results.push({ name: 'extractBlockContent', passed: extractTestsPassed });
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
    });
  }
  
  return failed === 0;
}

// Run all tests
const allTestsPassed = runAllTests();

// Exit with appropriate code
process.exit(allTestsPassed ? 0 : 1);

