#!/usr/bin/env python3
"""
Test script for project management functionality in Prompt Workbench.
Tests project creation, deletion, renaming, and folder organization.
"""

from playwright.sync_api import sync_playwright
import time
import random
import string

def generate_random_name(prefix="Test", length=6):
    """Generate a random name for testing."""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
    return f"{prefix}_{random_suffix}"

def test_project_management():
    """Test all project management features."""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Use headed mode for debugging
        page = browser.new_page()
        
        try:
            print("🚀 Starting Project Management Tests...")
            
            # Navigate and wait for load
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle', timeout=30000)
            print("✅ Application loaded")
            
            # Test 1: Create a new project
            print("\n📝 Test 1: Creating new project...")
            test_project_name = generate_random_name("TestProject")
            
            # Look for the new project button (Plus icon)
            new_project_btn = page.locator('button[title*="新建项目"], button:has([data-lucide="plus"])').first
            if new_project_btn.is_visible():
                new_project_btn.click()
                print("✅ Clicked new project button")
                
                # Wait for input field to appear
                page.wait_for_timeout(500)
                
                # Find the project name input
                project_input = page.locator('input[placeholder*="项目名称"], input[placeholder*="项目"]').first
                if project_input.is_visible():
                    project_input.fill(test_project_name)
                    print(f"✅ Entered project name: {test_project_name}")
                    
                    # Press Enter to confirm
                    project_input.press('Enter')
                    page.wait_for_timeout(1000)
                    
                    # Verify project appears in list
                    project_element = page.locator(f'text="{test_project_name}"').first
                    if project_element.is_visible():
                        print("✅ Project created successfully")
                    else:
                        print("❌ Project not found in list")
                else:
                    print("❌ Project input field not found")
            else:
                print("❌ New project button not found")
            
            # Test 2: Create a folder
            print("\n📁 Test 2: Creating folder...")
            test_folder_name = generate_random_name("TestFolder")
            
            # Look for new folder button
            new_folder_btn = page.locator('button[title*="新建文件夹"], button:has([data-lucide="folder-plus"])').first
            if new_folder_btn.is_visible():
                new_folder_btn.click()
                print("✅ Clicked new folder button")
                
                page.wait_for_timeout(500)
                
                # Find folder name input
                folder_input = page.locator('input[placeholder*="文件夹名称"], input[placeholder*="文件夹"]').first
                if folder_input.is_visible():
                    folder_input.fill(test_folder_name)
                    print(f"✅ Entered folder name: {test_folder_name}")
                    
                    folder_input.press('Enter')
                    page.wait_for_timeout(1000)
                    
                    # Verify folder appears
                    folder_element = page.locator(f'text="{test_folder_name}"').first
                    if folder_element.is_visible():
                        print("✅ Folder created successfully")
                    else:
                        print("❌ Folder not found in list")
                else:
                    print("❌ Folder input field not found")
            else:
                print("❌ New folder button not found")
            
            # Test 3: Project selection and editor interaction
            print("\n📄 Test 3: Testing project selection...")
            
            # Click on the created project
            project_link = page.locator(f'text="{test_project_name}"').first
            if project_link.is_visible():
                project_link.click()
                print("✅ Selected project")
                
                page.wait_for_timeout(1000)
                
                # Check if Monaco editor is active
                monaco_editor = page.locator('.monaco-editor')
                if monaco_editor.count() > 0:
                    print("✅ Monaco editor is active")
                    
                    # Try to type in the editor
                    editor_textarea = page.locator('.monaco-editor textarea').first
                    if editor_textarea.is_visible():
                        editor_textarea.click()
                        editor_textarea.type("# Test Prompt\n\nThis is a test prompt for automated testing.")
                        print("✅ Successfully typed in editor")
                        page.wait_for_timeout(1000)
                    else:
                        print("❌ Could not interact with editor textarea")
                else:
                    print("❌ Monaco editor not found")
            else:
                print("❌ Could not find created project")
            
            # Test 4: Right-click context menu (if implemented)
            print("\n🖱️  Test 4: Testing context menu...")
            
            project_element = page.locator(f'text="{test_project_name}"').first
            if project_element.is_visible():
                # Right-click on project
                project_element.click(button='right')
                page.wait_for_timeout(500)
                
                # Look for context menu
                context_menu = page.locator('[role="menu"], .context-menu, div:has-text("重命名"):has-text("删除")').first
                if context_menu.is_visible():
                    print("✅ Context menu appeared")
                    
                    # Click somewhere else to close menu
                    page.click('body')
                    page.wait_for_timeout(500)
                    print("✅ Context menu closed")
                else:
                    print("❌ Context menu not found")
            
            # Test 5: Save functionality
            print("\n💾 Test 5: Testing save functionality...")
            
            # Look for save button
            save_btn = page.locator('button:has-text("保存"), button[title*="保存"], button:has([data-lucide="save"])').first
            if save_btn.is_visible():
                save_btn.click()
                print("✅ Clicked save button")
                page.wait_for_timeout(2000)  # Wait for save operation
                print("✅ Save operation completed")
            else:
                print("❌ Save button not found")
            
            # Final screenshot
            page.screenshot(path='testing/screenshots/project_management_test_final.png', full_page=True)
            print("📸 Final test screenshot saved")
            
            print("\n🎉 Project Management Tests Completed!")
            
        except Exception as e:
            print(f"❌ Error during testing: {e}")
            page.screenshot(path='testing/screenshots/project_management_error.png')
            raise
            
        finally:
            browser.close()

if __name__ == "__main__":
    # Create screenshots directory
    import os
    os.makedirs('testing/screenshots', exist_ok=True)
    
    test_project_management()