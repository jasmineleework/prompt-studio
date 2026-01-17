#!/usr/bin/env python3
"""
Element discovery script specifically for Prompt Workbench.
Discovers and analyzes UI elements in the application.
"""

from playwright.sync_api import sync_playwright
import json
import time

def discover_prompt_workbench_elements():
    """Discover and analyze elements in the Prompt Workbench app."""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to the Next.js app (default port 3000)
            print("Navigating to Prompt Workbench (http://localhost:3000)...")
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle', timeout=30000)
            
            print("✅ Page loaded successfully")
            
            # Take initial screenshot
            page.screenshot(path='testing/screenshots/initial_load.png', full_page=True)
            print("📸 Initial screenshot saved")
            
            # Discover project management section
            print("\n🔍 Analyzing Project Management Panel...")
            project_buttons = page.locator('[data-testid], button').filter(has_text="项目").all()
            folder_buttons = page.locator('button').filter(has_text="文件夹").all()
            
            print(f"Found {len(project_buttons)} project-related buttons")
            print(f"Found {len(folder_buttons)} folder-related buttons")
            
            # Discover main editor area
            print("\n🔍 Analyzing Editor Area...")
            monaco_editor = page.locator('.monaco-editor')
            if monaco_editor.count() > 0:
                print("✅ Monaco Editor detected")
                editor_rect = monaco_editor.bounding_box()
                if editor_rect:
                    print(f"Editor dimensions: {editor_rect['width']}x{editor_rect['height']}")
            else:
                print("❌ Monaco Editor not found")
            
            # Check for toolbar and status bar
            toolbar_elements = page.locator('[data-testid*="toolbar"], .toolbar, .editor-toolbar').all()
            status_elements = page.locator('[data-testid*="status"], .status, .editor-status').all()
            
            print(f"Found {len(toolbar_elements)} toolbar elements")
            print(f"Found {len(status_elements)} status bar elements")
            
            # Discover version selector
            print("\n🔍 Analyzing Version Control...")
            version_selectors = page.locator('select, [data-testid*="version"]').all()
            version_buttons = page.locator('button').filter(has_text="版本").all()
            
            print(f"Found {len(version_selectors)} version selector elements")
            print(f"Found {len(version_buttons)} version-related buttons")
            
            # Discover all interactive elements
            print("\n🔍 Complete Interactive Elements Inventory...")
            
            # Buttons
            all_buttons = page.locator('button').all()
            visible_buttons = [btn for btn in all_buttons if btn.is_visible()]
            print(f"Buttons: {len(visible_buttons)} visible out of {len(all_buttons)} total")
            
            for i, btn in enumerate(visible_buttons[:10]):  # Show first 10
                text = btn.inner_text().strip() or btn.get_attribute('title') or f"[Button {i}]"
                print(f"  - {text}")
            
            # Input fields
            inputs = page.locator('input, textarea, select').all()
            visible_inputs = [inp for inp in inputs if inp.is_visible()]
            print(f"\nInput fields: {len(visible_inputs)} visible out of {len(inputs)} total")
            
            for inp in visible_inputs:
                name = inp.get_attribute('name') or inp.get_attribute('placeholder') or "[unnamed]"
                input_type = inp.get_attribute('type') or inp.tag_name
                print(f"  - {name} ({input_type})")
            
            # Links and navigation
            links = page.locator('a[href]').all()
            print(f"\nLinks: {len(links)} found")
            
            # Check for context menus and dropdowns
            dropdowns = page.locator('[role="menu"], .dropdown, .context-menu').all()
            print(f"Dropdown/Context menus: {len(dropdowns)} found")
            
            # Test basic interaction - click on project management area
            print("\n🧪 Testing Basic Interactions...")
            
            # Try to click the project management header
            project_header = page.locator('text=项目管理').first
            if project_header.is_visible():
                project_header.click()
                print("✅ Clicked project management header")
                page.wait_for_timeout(1000)  # Wait 1 second
            
            # Look for "新建项目" or "新建" button
            new_project_btn = page.locator('button[title*="新建"], button:has-text("新建")').first
            if new_project_btn.is_visible():
                print("✅ Found new project button")
                # Take screenshot before interaction
                page.screenshot(path='testing/screenshots/before_new_project.png')
            
            # Final screenshot
            page.screenshot(path='testing/screenshots/final_state.png', full_page=True)
            print("📸 Final screenshot saved")
            
            # Save page HTML for analysis
            html_content = page.content()
            with open('testing/screenshots/page_source.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
            print("💾 Page HTML saved for analysis")
            
            print(f"\n✅ Discovery completed successfully!")
            print(f"Screenshots saved in testing/screenshots/")
            
        except Exception as e:
            print(f"❌ Error during discovery: {e}")
            page.screenshot(path='testing/screenshots/error_state.png')
            
        finally:
            browser.close()

if __name__ == "__main__":
    # Create screenshots directory if it doesn't exist
    import os
    os.makedirs('testing/screenshots', exist_ok=True)
    
    discover_prompt_workbench_elements()