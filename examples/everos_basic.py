"""Basic EverOS integration example for Cortex."""

import sys
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from cortex.memory import EverOSMemoryManager, Message, MemoryType, RetrievalMethod


def main():
    """Demonstrate EverOS memory management."""

    # Initialize memory manager for a student
    student_id = "student_001"
    memory = EverOSMemoryManager(user_id=student_id)

    print(f"📚 Cortex Learning Memory Manager\n")
    print(f"Student ID: {student_id}")
    print(f"Session ID: {memory.session_id}\n")

    # 1. Record a learning conversation
    print("1️⃣  Recording learning conversation...")
    messages = [
        Message(
            role="user",
            content="I'm struggling with quadratic equations, especially factoring.",
        ),
        Message(
            role="assistant",
            content="Let's break it down. A quadratic equation has the form ax² + bx + c = 0. "
            "Factoring looks for two numbers that multiply to ac and add to b.",
        ),
        Message(
            role="user",
            content="So for x² + 5x + 6 = 0, I need numbers that multiply to 6 and add to 5?",
        ),
        Message(
            role="assistant",
            content="Exactly! That's 2 and 3. So it factors as (x + 2)(x + 3) = 0.",
        ),
    ]

    response = memory.add_messages(messages)
    print(f"   Status: {response.get('status', 'unknown')}")
    print(f"   Messages queued: {response.get('message_count', '?')}\n")

    # 2. Force consolidation
    print("2️⃣  Triggering memory consolidation...")
    flush_response = memory.flush()
    print(f"   Status: {flush_response.get('status', 'unknown')}\n")

    # Wait a moment for processing
    time.sleep(1)

    # 3. Record a session outcome
    print("3️⃣  Recording learning session...")
    memory.record_learning_session(
        topic="Quadratic Equations - Factoring",
        summary="Student learned factoring method. Completed 3 practice problems successfully.",
        score=85.0,
    )
    print("   Session recorded\n")

    # 4. Search for learning context
    print("4️⃣  Retrieving learning context for Quadratic Equations...")
    context = memory.get_learning_context(
        topic="Quadratic Equations",
        include_progress=True,
    )

    if context.get("profile"):
        print(f"   Profile entries found: {len(context['profile'])}")
        for entry in context["profile"][:1]:
            print(f"   → {entry.get('summary', entry)[:100]}...")

    if context.get("episodes"):
        print(f"   Episode entries found: {len(context['episodes'])}")
        for entry in context["episodes"][:1]:
            print(f"   → {entry.get('episode', entry)[:100]}...")

    if context.get("progress"):
        print(f"   Progress records found: {len(context['progress'])}")

    print()

    # 5. Search for specific information
    print("5️⃣  Searching for 'factoring method'...")
    search_results = memory.search(
        query="factoring quadratic equations method steps",
        method=RetrievalMethod.HYBRID,
        top_k=3,
    )

    print(f"   Episodes found: {len(search_results.get('episodes', []))}")
    print(f"   Profiles found: {len(search_results.get('profiles', []))}\n")

    # 6. Get consolidated profile
    print("6️⃣  Retrieving consolidated student profile...")
    profile = memory.get_profile()
    if profile:
        print(f"   Profile data available: Yes")
        print(f"   Entry count: {len(profile)}")
    else:
        print("   Profile data not yet consolidated (async processing in progress)\n")

    print("✅ Example complete!")
    print("\nNext steps:")
    print("  • Continue adding more learning conversations")
    print("  • Use search() for context-aware personalization")
    print("  • Integrate into your AI tutor agent")
    print("  • Monitor memory consolidation via EverOS dashboard")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nSetup troubleshooting:")
        print("  1. Ensure EVEROS_API_KEY is set:")
        print("     export EVEROS_API_KEY='b600baa8-4f5b-43f3-abbc-feef04830f71'")
        print("  2. Install dependencies:")
        print("     pip install -r requirements.txt")
        sys.exit(1)
