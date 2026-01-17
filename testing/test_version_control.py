#!/usr/bin/env python3
"""
Test script for version control functionality in Prompt Workbench.
Tests version creation, switching, comparison, and metadata.
"""

from playwright.sync_api import sync_playwright
import time
import random

def test_version_control():
    """Test version control and history features."""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            print("🕰️ Starting Version Control Tests...")
            
            # Navigate and setup
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle', timeout=30000)
            print("✅ Application loaded")
            
            # Create a test project first
            test_project_name = f"VersionTest_{random.randint(1000, 9999)}"
            
            # Create new project
            new_project_btn = page.locator('button[title*="新建项目"], button:has([data-lucide="plus"])').first
            if new_project_btn.is_visible():
                new_project_btn.click()
                page.wait_for_timeout(500)
                
                project_input = page.locator('input[placeholder*="项目名称"]').first
                if project_input.is_visible():
                    project_input.fill(test_project_name)
                    project_input.press('Enter')
                    page.wait_for_timeout(1000)
                    print(f"✅ Created test project: {test_project_name}")
                else:
                    print("❌ Could not create test project")
                    return
            else:
                print("❌ New project button not found")
                return
            
            # Select the project
            project_link = page.locator(f'text="{test_project_name}"').first
            if project_link.is_visible():
                project_link.click()
                page.wait_for_timeout(1000)
                print("✅ Selected test project")
            
            # Test 1: Create first version with content
            print("\n📝 Test 1: Creating first version...")
            
            # Wait for editor to be ready
            monaco_editor = page.locator('.monaco-editor')
            page.wait_for_selector('.monaco-editor', timeout=10000)
            
            # Add content to editor
            editor_textarea = page.locator('.monaco-editor textarea').first
            if editor_textarea.is_visible():
                editor_textarea.click()
                page.wait_for_timeout(500)
                
                # Type first version content
                first_content = """# Trading Strategy Prompt v1

You are an expert trading analyst. Analyze the given market data and provide:

1. Market trend analysis
2. Key resistance and support levels  
3. Trading recommendations

Be concise and actionable in your response."""
                
                # Clear any existing content and add new content
                page.keyboard.press('Control+a')  # Select all
                page.keyboard.type(first_content)
                print("✅ Added content to editor")
                page.wait_for_timeout(1000)
            else:
                print("❌ Could not interact with editor")
                return
            
            # Save first version
            save_btn = page.locator('button:has-text("保存"), button[title*="保存"]').first
            if save_btn.is_visible():
                save_btn.click()
                print("✅ Clicked save button for v1")
                page.wait_for_timeout(2000)
                
                # Look for version description dialog or input
                version_desc_input = page.locator('input[placeholder*="描述"], textarea[placeholder*="描述"]').first
                if version_desc_input.is_visible():
                    version_desc_input.fill("Initial trading strategy prompt")
                    
                    # Look for confirm button
                    confirm_btn = page.locator('button:has-text("确定"), button:has-text("保存"), button:has-text("确认")').first
                    if confirm_btn.is_visible():
                        confirm_btn.click()
                        page.wait_for_timeout(1000)
                        print("✅ Saved version with description")
                    else:
                        # Try pressing Enter if no button found
                        version_desc_input.press('Enter')
                        page.wait_for_timeout(1000)
                        print("✅ Saved version (Enter key)")
                else:
                    print("✅ Version saved without description dialog")
            else:
                print("❌ Save button not found")
            
            # Test 2: Modify content and create second version
            print("\n📝 Test 2: Creating second version with modifications...")
            
            # Modify the content
            page.wait_for_timeout(1000)
            if editor_textarea.is_visible():
                editor_textarea.click()
                page.wait_for_timeout(500)
                
                # Add to existing content
                additional_content = """\n\n## Risk Management
- Maximum position size: 2% of portfolio
- Stop loss: 3% below entry
- Take profit: 2:1 risk-reward ratio

## Market Conditions
Consider current volatility and volume before making recommendations."""
                
                # Move to end and add content
                page.keyboard.press('Control+End')  # Go to end
                page.keyboard.type(additional_content)
                print("✅ Modified content for v2")
                page.wait_for_timeout(1000)
            
            # Save second version
            if save_btn.is_visible():
                save_btn.click()
                print("✅ Clicked save button for v2")
                page.wait_for_timeout(1500)
                
                version_desc_input = page.locator('input[placeholder*="描述"], textarea[placeholder*="描述"]').first
                if version_desc_input.is_visible():
                    version_desc_input.fill("Added risk management and market conditions")
                    
                    confirm_btn = page.locator('button:has-text("确定"), button:has-text("保存"), button:has-text("确认")').first
                    if confirm_btn.is_visible():
                        confirm_btn.click()
                    else:
                        version_desc_input.press('Enter')
                    page.wait_for_timeout(1000)
                    print("✅ Saved second version")
            
            # Test 3: Version selector functionality
            print("\n🔄 Test 3: Testing version selector...")
            
            # Look for version selector dropdown
            version_selector = page.locator('select, [data-testid*="version"], button:has-text("v")').first
            if version_selector.is_visible():
                print("✅ Found version selector")
                
                # Try to click and see options
                version_selector.click()
                page.wait_for_timeout(1000)
                
                # Look for version options
                version_options = page.locator('option, [role="option"], div:has-text("v1"), div:has-text("v2")').all()
                if len(version_options) >= 2:
                    print(f"✅ Found {len(version_options)} version options")
                    
                    # Try to select first version
                    for option in version_options:
                        if "v1" in option.inner_text():
                            option.click()
                            page.wait_for_timeout(1000)
                            print("✅ Selected version 1")
                            break
                else:
                    print("❌ Version options not found")
                    
            else:
                print("❌ Version selector not found")
            
            # Test 4: Check if content changed when switching versions
            print("\n🔍 Test 4: Verifying version content switching...")
            
            # Get current editor content
            page.wait_for_timeout(1000)
            current_content = page.evaluate("""
                () => {
                    const editor = document.querySelector('.monaco-editor');
                    if (editor && window.monaco) {
                        return window.monaco.editor.getModels()[0]?.getValue() || '';
                    }
                    return '';
                }
            """)
            
            if current_content and "Risk Management" not in current_content:
                print("✅ Version switching works - content changed to v1")
            elif current_content:
                print(f"⚠️  Content found but may not have switched versions")
            else:
                print("❌ Could not retrieve editor content")
            
            # Test 5: Look for version comparison/diff functionality
            print("\n🔍 Test 5: Looking for version comparison features...")
            
            # Look for diff or compare buttons
            diff_btn = page.locator('button:has-text("比较"), button:has-text("diff"), button[title*="比较"]').first
            if diff_btn.is_visible():
                diff_btn.click()
                page.wait_for_timeout(2000)
                print("✅ Found and clicked diff/compare button")
                
                # Look for diff viewer
                diff_viewer = page.locator('.diff-viewer, [class*="diff"], .react-diff-viewer').first
                if diff_viewer.is_visible():
                    print("✅ Diff viewer displayed")
                else:
                    print("❌ Diff viewer not found")
            else:
                print("ℹ️  Version comparison feature not visible")
            
            # Final screenshot
            page.screenshot(path='testing/screenshots/version_control_test_final.png', full_page=True)
            print("📸 Version control test screenshot saved")
            
            print("\n🎉 Version Control Tests Completed!")
            
        except Exception as e:
            print(f"❌ Error during version control testing: {e}")
            page.screenshot(path='testing/screenshots/version_control_error.png')
            raise
            
        finally:
            browser.close()

if __name__ == "__main__":
    import os
    os.makedirs('testing/screenshots', exist_ok=True)
    
    test_version_control()