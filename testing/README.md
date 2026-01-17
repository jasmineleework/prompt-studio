# Prompt Workbench Testing Suite

This directory contains automated testing tools for the Prompt Workbench application using the Anthropic WebApp Testing skill framework.

## 🚀 Quick Start

### 1. Setup Testing Environment

```bash
# Install Python dependencies and setup testing environment
npm run test:setup
```

This will:
- Create a Python virtual environment
- Install Playwright and dependencies
- Download browser binaries
- Set up the testing infrastructure

### 2. Run Tests

```bash
# Run element discovery to map UI components
npm run test:discover

# Test project management features
npm run test:projects

# Test version control features  
npm run test:versions

# Run all tests
npm run test:all
```

## 📁 Directory Structure

```
testing/
├── scripts/
│   └── with_server.py          # Server lifecycle management
├── examples/
│   ├── console_logging.py      # Console output testing
│   ├── element_discovery.py    # Generic element discovery
│   ├── static_html_automation.py  # Static page testing
│   └── prompt_workbench_discovery.py  # App-specific discovery
├── test_project_management.py  # Project CRUD tests
├── test_version_control.py     # Version history tests
├── screenshots/                # Test screenshots
├── requirements.txt            # Python dependencies
├── setup.py                   # Environment setup script
└── README.md                  # This file
```

## 🧪 Test Scripts

### Element Discovery (`prompt_workbench_discovery.py`)
- Maps all UI elements in the application
- Takes screenshots for visual verification
- Analyzes interactive components
- Saves HTML source for debugging

### Project Management Tests (`test_project_management.py`)
- Create new projects and folders
- Test project selection and navigation
- Verify editor interaction
- Test context menus and UI interactions
- Validate save functionality

### Version Control Tests (`test_version_control.py`)
- Create and save multiple versions
- Test version switching
- Verify content persistence
- Test version descriptions and metadata
- Check diff/comparison features

## ⚙️ Configuration

### Environment Variables
You can customize testing behavior with environment variables:

```bash
export HEADLESS=false          # Run browser in headed mode
export TEST_TIMEOUT=60        # Increase timeout for slow systems  
export SCREENSHOT_PATH=./screenshots  # Custom screenshot directory
```

### Playwright Settings
Tests use these default Playwright settings:
- Browser: Chromium
- Headless: True (unless debugging)
- Timeout: 30 seconds
- Screenshots: Full page
- Wait strategy: networkidle

## 🐛 Debugging

### Running Tests in Headed Mode
For debugging, modify test scripts to use `headless=False`:

```python
browser = p.chromium.launch(headless=False)
```

### Screenshot Analysis
All tests save screenshots to `testing/screenshots/`:
- `initial_load.png` - App first load
- `project_management_test_final.png` - After project tests
- `version_control_test_final.png` - After version tests
- `error_state.png` - When errors occur

### Console Logs
Enable console logging by adding to test scripts:

```python
page.on("console", lambda msg: print(f"Console: {msg.text}"))
page.on("pageerror", lambda error: print(f"Page error: {error}"))
```

## 🔧 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Python environment issues**
   ```bash
   cd testing
   rm -rf venv
   python3 setup.py
   ```

3. **Playwright browser installation**
   ```bash
   cd testing
   source venv/bin/activate
   playwright install chromium
   ```

4. **Permission errors on macOS**
   ```bash
   chmod +x testing/scripts/with_server.py
   chmod +x testing/setup.py
   ```

### Testing Different Scenarios

#### Test with Existing Data
```bash
# Ensure you have some projects already created
npm run test:discover
```

#### Test Empty State
```bash
# Clear browser data first, then run tests
npm run test:projects
```

#### Performance Testing
```bash
# Create many projects first, then test performance
# Modify test scripts to create 50+ projects
npm run test:projects
```

## 📊 Test Reports

Test results are logged to console with emojis for easy scanning:
- ✅ Success
- ❌ Error  
- ⚠️  Warning
- ℹ️  Info
- 📸 Screenshot saved
- 🧪 Test action

## 🚀 Advanced Usage

### Custom Test Scripts
Create custom test scripts following this pattern:

```python
#!/usr/bin/env python3
from playwright.sync_api import sync_playwright

def test_custom_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')
            
            # Your test logic here
            
        finally:
            browser.close()

if __name__ == "__main__":
    test_custom_feature()
```

### Running with Different Browsers
```python
# Use Firefox
browser = p.firefox.launch()

# Use WebKit (Safari)  
browser = p.webkit.launch()
```

### Mobile Testing
```python
# iPhone simulation
iphone = p.devices['iPhone 12']
browser = p.chromium.launch()
context = browser.new_context(**iphone)
page = context.new_page()
```

## 🤝 Contributing

When adding new tests:
1. Follow the existing naming convention
2. Add comprehensive error handling
3. Include screenshots for debugging
4. Update this README with new test descriptions
5. Test on both headed and headless modes

## 📝 Notes

- Tests are designed to be idempotent where possible
- Some tests create test data that may persist in IndexedDB
- Screenshots and HTML dumps are saved for all test runs
- The testing framework is based on Anthropic's webapp-testing skill
- All tests use the same server startup pattern via `with_server.py`