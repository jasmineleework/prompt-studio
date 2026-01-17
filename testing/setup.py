#!/usr/bin/env python3
"""
Setup script for Prompt Workbench testing environment.
This script sets up the Python virtual environment and installs dependencies.
"""

import subprocess
import sys
import os

def run_command(command, description=""):
    """Run a shell command and handle errors."""
    print(f"\n{description}")
    print(f"Running: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        if e.stdout:
            print(f"stdout: {e.stdout}")
        if e.stderr:
            print(f"stderr: {e.stderr}")
        return False

def main():
    print("Setting up Prompt Workbench testing environment...")
    
    # Check if Python 3 is available
    try:
        result = subprocess.run([sys.executable, "--version"], capture_output=True, text=True)
        print(f"Using Python: {result.stdout.strip()}")
    except Exception as e:
        print(f"Error checking Python version: {e}")
        sys.exit(1)
    
    # Get current directory
    test_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(test_dir)
    
    # Create virtual environment if it doesn't exist
    venv_dir = os.path.join(test_dir, "venv")
    if not os.path.exists(venv_dir):
        if not run_command(f"python3 -m venv {venv_dir}", "Creating virtual environment..."):
            print("Failed to create virtual environment")
            sys.exit(1)
    else:
        print("Virtual environment already exists")
    
    # Determine activation script based on OS
    if os.name == 'nt':  # Windows
        activate_script = os.path.join(venv_dir, "Scripts", "activate")
        pip_path = os.path.join(venv_dir, "Scripts", "pip")
    else:  # Unix/Linux/macOS
        activate_script = os.path.join(venv_dir, "bin", "activate")
        pip_path = os.path.join(venv_dir, "bin", "pip")
    
    # Install requirements
    requirements_file = os.path.join(test_dir, "requirements.txt")
    if os.path.exists(requirements_file):
        if not run_command(f"{pip_path} install -r {requirements_file}", "Installing Python dependencies..."):
            print("Failed to install dependencies")
            sys.exit(1)
    
    # Install Playwright browsers
    playwright_path = os.path.join(venv_dir, "bin", "playwright") if os.name != 'nt' else os.path.join(venv_dir, "Scripts", "playwright")
    if not run_command(f"{playwright_path} install", "Installing Playwright browsers..."):
        print("Failed to install Playwright browsers")
        sys.exit(1)
    
    print("\n✅ Setup completed successfully!")
    print(f"\nTo activate the virtual environment, run:")
    if os.name == 'nt':
        print(f"  {activate_script}")
    else:
        print(f"  source {activate_script}")
    
    print(f"\nTo run tests, use:")
    print(f"  cd {test_dir}")
    print(f"  python scripts/with_server.py --server 'npm run dev' --port 3000 -- python examples/element_discovery.py")

if __name__ == "__main__":
    main()