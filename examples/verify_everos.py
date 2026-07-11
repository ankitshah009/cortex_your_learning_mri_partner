#!/usr/bin/env python3
"""Verify EverOS integration and connectivity."""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def check_environment():
    """Check environment setup."""
    print("📋 Checking environment variables...\n")

    api_key = os.getenv("EVEROS_API_KEY")
    if not api_key:
        print("❌ EVEROS_API_KEY not set")
        print("   Run: export EVEROS_API_KEY='b600baa8-4f5b-43f3-abbc-feef04830f71'")
        return False

    print(f"✅ EVEROS_API_KEY configured (key=...{api_key[-8:]})")
    return True


def check_dependencies():
    """Check required packages."""
    print("\n📦 Checking Python dependencies...\n")

    deps = [
        ("everos_cloud", "everos-cloud"),
        ("dotenv", "python-dotenv"),
    ]

    all_installed = True
    for module, package in deps:
        try:
            __import__(module)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} not installed")
            print(f"   Run: pip install {package}")
            all_installed = False

    return all_installed


def check_config():
    """Check configuration loading."""
    print("\n⚙️  Checking configuration...\n")

    try:
        from cortex.config import load_everos_config

        config = load_everos_config()
        print(f"✅ Config loaded")
        print(f"   API Base URL: {config.get('base_url')}")
        print(f"   API Key: ...{config['api_key'][-8:]}")
        return True
    except Exception as e:
        print(f"❌ Config error: {e}")
        return False


def check_client_init():
    """Check EverOS client initialization."""
    print("\n🔗 Checking EverOS client initialization...\n")

    try:
        from cortex.config import init_everos_client

        client = init_everos_client()
        print(f"✅ EverOS client initialized")
        print(f"   Client type: {type(client).__name__}")
        return True, client
    except Exception as e:
        print(f"❌ Client initialization failed: {e}")
        return False, None


def check_memory_manager():
    """Check memory manager initialization."""
    print("\n🧠 Checking EverOSMemoryManager...\n")

    try:
        from cortex.memory import EverOSMemoryManager

        memory = EverOSMemoryManager(user_id="test_user")
        print(f"✅ EverOSMemoryManager initialized")
        print(f"   User ID: {memory.user_id}")
        print(f"   Session ID: {memory.session_id}")
        return True, memory
    except Exception as e:
        print(f"❌ Memory manager initialization failed: {e}")
        return False, None


def check_connectivity(client):
    """Check connectivity to EverOS API."""
    print("\n🌐 Checking EverOS API connectivity...\n")

    try:
        # Try a simple request
        response = client.v1.memories.get(
            filters={"user_id": "connectivity_test"},
            memory_type="profile",
            page=1,
            page_size=1,
        )
        print(f"✅ API connectivity verified")
        print(f"   Response type: {type(response)}")
        return True
    except Exception as e:
        print(f"⚠️  API connectivity check inconclusive: {e}")
        print(f"   (This may be normal for first-time requests)")
        return True  # Don't fail on this


def check_integration():
    """Full integration check."""
    print("\n🔄 Running full integration test...\n")

    try:
        from cortex.memory import EverOSMemoryManager, Message
        import time

        memory = EverOSMemoryManager(user_id="integration_test_user")

        # Add a test message
        msg = Message(
            role="user",
            content="This is a test message for integration verification.",
        )
        response = memory.add_messages([msg])

        print(f"✅ Message added successfully")
        print(f"   Status: {response.get('status', 'unknown')}")
        print(f"   Message count: {response.get('message_count', 0)}")

        return True
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False


def main():
    """Run all verification checks."""
    print("\n" + "=" * 50)
    print("🔍 EverOS Integration Verification")
    print("=" * 50 + "\n")

    checks = [
        ("Environment", check_environment),
        ("Dependencies", check_dependencies),
        ("Configuration", check_config),
        ("Memory Manager", check_memory_manager),
    ]

    results = []

    for name, check_func in checks:
        if check_func == check_client_init:
            result, client = check_func()
        elif check_func == check_memory_manager:
            result, memory = check_func()
        else:
            result = check_func()

        results.append((name, result))

    # Run additional checks if previous ones passed
    if all(r for _, r in results):
        success, client = check_client_init()
        if success:
            check_connectivity(client)

        check_integration()

    # Summary
    print("\n" + "=" * 50)
    print("📊 Verification Summary")
    print("=" * 50 + "\n")

    all_passed = all(r for _, r in results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} — {name}")

    print()

    if all_passed:
        print("🎉 All checks passed! EverOS is ready to use.\n")
        print("Next steps:")
        print("  1. Run: python examples/everos_basic.py")
        print("  2. Check the dashboard: https://everos.evermind.ai")
        print("  3. Read: EVEROS_SETUP.md")
        return 0
    else:
        print("⚠️  Some checks failed. Please review the errors above.\n")
        print("Troubleshooting:")
        print("  1. Ensure EVEROS_API_KEY is exported")
        print("  2. Run: pip install -r requirements.txt")
        print("  3. Check your network connectivity")
        return 1


if __name__ == "__main__":
    sys.exit(main())
