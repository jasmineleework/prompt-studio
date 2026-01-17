#!/usr/bin/env python3
"""
Master test runner for Prompt Workbench.
Orchestrates all test suites and provides comprehensive reporting.
"""

import subprocess
import sys
import os
import time
from datetime import datetime
import json

def run_command(command, description="", timeout=300):
    """Run a command and capture output."""
    print(f"\n🚀 {description}")
    print(f"Running: {command}")
    print("-" * 50)
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=timeout,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        duration = time.time() - start_time
        
        print(f"⏱️  Duration: {duration:.2f}s")
        
        if result.stdout:
            print("📤 Output:")
            print(result.stdout)
            
        if result.stderr:
            print("⚠️  Stderr:")
            print(result.stderr)
        
        if result.returncode == 0:
            print(f"✅ {description} - PASSED")
            return True, result.stdout, duration
        else:
            print(f"❌ {description} - FAILED (exit code: {result.returncode})")
            return False, result.stderr, duration
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} - TIMEOUT ({timeout}s)")
        return False, "Timeout", timeout
    except Exception as e:
        print(f"💥 {description} - ERROR: {e}")
        return False, str(e), 0

def generate_report(test_results):
    """Generate a comprehensive test report."""
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": len(test_results),
        "passed": sum(1 for r in test_results if r["passed"]),
        "failed": sum(1 for r in test_results if not r["passed"]),
        "total_duration": sum(r["duration"] for r in test_results),
        "tests": test_results
    }
    
    # Save JSON report
    report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print("\n" + "="*60)
    print("🧪 TEST SUMMARY")
    print("="*60)
    print(f"Total Tests: {report['total_tests']}")
    print(f"Passed: {report['passed']} ✅")
    print(f"Failed: {report['failed']} ❌")
    print(f"Success Rate: {(report['passed']/report['total_tests']*100):.1f}%")
    print(f"Total Duration: {report['total_duration']:.2f}s")
    print(f"Report saved: {report_file}")
    
    # Detailed results
    print("\n📋 DETAILED RESULTS:")
    print("-" * 40)
    for test in test_results:
        status = "✅ PASS" if test["passed"] else "❌ FAIL"
        print(f"{status} | {test['name']:<25} | {test['duration']:>6.2f}s")
    
    return report

def main():
    """Main test runner."""
    print("🧪 Prompt Workbench Test Suite")
    print("=" * 40)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Create screenshots directory
    os.makedirs('screenshots', exist_ok=True)
    
    test_results = []
    
    # Test suite configuration
    tests = [
        {
            "name": "Element Discovery",
            "command": "python3 scripts/with_server.py --server 'cd .. && npm run dev' --port 3000 --timeout 45 -- python3 examples/prompt_workbench_discovery.py",
            "timeout": 120
        },
        {
            "name": "Project Management",
            "command": "python3 scripts/with_server.py --server 'cd .. && npm run dev' --port 3000 --timeout 45 -- python3 test_project_management.py",
            "timeout": 180
        },
        {
            "name": "Version Control",
            "command": "python3 scripts/with_server.py --server 'cd .. && npm run dev' --port 3000 --timeout 45 -- python3 test_version_control.py",
            "timeout": 180
        }
    ]
    
    # Run tests
    for test in tests:
        passed, output, duration = run_command(
            test["command"], 
            test["name"], 
            test.get("timeout", 300)
        )
        
        test_results.append({
            "name": test["name"],
            "passed": passed,
            "output": output,
            "duration": duration,
            "command": test["command"]
        })
        
        # Add delay between tests
        if test != tests[-1]:  # Not the last test
            print("\n⏳ Waiting 3 seconds before next test...")
            time.sleep(3)
    
    # Generate final report
    report = generate_report(test_results)
    
    # Exit with appropriate code
    if report["failed"] == 0:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n💥 {report['failed']} tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()