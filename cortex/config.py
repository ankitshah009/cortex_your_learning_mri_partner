"""EverOS configuration and initialization."""

import os
from typing import Optional
from dotenv import load_dotenv


def load_everos_config() -> dict:
    """Load EverOS configuration from environment.

    Returns:
        dict: Configuration dict with api_key and optional base_url

    Raises:
        ValueError: If EVEROS_API_KEY is not set
    """
    load_dotenv()

    api_key = os.getenv("EVEROS_API_KEY")
    if not api_key:
        raise ValueError(
            "EVEROS_API_KEY environment variable not set. "
            "Run: export EVEROS_API_KEY='b600baa8-4f5b-43f3-abbc-feef04830f71'"
        )

    base_url = os.getenv("EVEROS_BASE_URL", "https://api.evermind.ai")

    return {
        "api_key": api_key,
        "base_url": base_url,
    }


def init_everos_client():
    """Initialize and return EverOS client.

    Returns:
        EverOS: Initialized Cloud SDK client
    """
    try:
        from everos_cloud import EverOS
    except ImportError:
        raise ImportError(
            "everos-cloud not installed. Run: pip install everos-cloud"
        )

    config = load_everos_config()
    client = EverOS(api_key=config["api_key"])
    return client
