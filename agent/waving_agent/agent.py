"""This module defines a simple waving agent using the Google ADK.

The agent is configured to greet the user with a wave.
"""
from google.adk.agents import Agent

root_agent = Agent(
    name="waving_agent",
    model="gemini-2.0-flash",
    description=("Waves the user."),
    instruction=("You are a helpful agent who waves the user."),
    tools=[],
)
